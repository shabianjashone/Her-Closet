import asyncio
import base64
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Literal, Optional

import bcrypt
import certifi
import jwt
import requests as http_requests
import resend
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, ConfigDict, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---- Config ----
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = os.environ.get("JWT_ALGORITHM", "HS256")
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
ADMIN_NOTIFY_EMAIL = os.environ.get("ADMIN_NOTIFY_EMAIL", "")

ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
PARTNER_EMAIL = os.environ["PARTNER_EMAIL"]
PARTNER_PASSWORD = os.environ["PARTNER_PASSWORD"]

if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

_is_atlas = "mongodb+srv://" in MONGO_URL or "mongodb.net" in MONGO_URL
_mongo_kwargs = {"serverSelectionTimeoutMS": 20000}
if _is_atlas:
    _mongo_kwargs["tls"] = True
    _mongo_kwargs["tlsCAFile"] = certifi.where()

client = AsyncIOMotorClient(MONGO_URL, **_mongo_kwargs)
db = client[DB_NAME]

app = FastAPI(title="Her Closet API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# ---- Helpers ----
def now_iso():
    return datetime.now(timezone.utc).isoformat()


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_token(user_id: str, role: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def send_activity_email(to_email: str, item_name: str, hairstyle: str, ts: str) -> None:
    """Best-effort email notification. Never raises - failures are logged only."""
    if not RESEND_API_KEY:
        return
    try:
        recipients = [e for e in [ADMIN_NOTIFY_EMAIL] if e]
        if not recipients:
            return
        resend.Emails.send(
            {
                "from": SENDER_EMAIL,
                "to": recipients,
                "subject": "New try-on generated on Her Closet",
                "html": (
                    f"<p>{to_email} generated a try-on.</p>"
                    f"<p>Item: {item_name}</p>"
                    f"<p>Hairstyle: {hairstyle}</p>"
                    f"<p>Time: {ts}</p>"
                ),
            }
        )
    except Exception:
        logger.exception("Failed to send activity email (non-fatal)")


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = await db.users.find_one(
        {"id": payload.get("user_id")}, {"_id": 0, "password_hash": 0}
    )
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


# ---- Models ----
class LoginRequest(BaseModel):
    email: str
    password: str


class WardrobeItemCreate(BaseModel):
    name: str
    category: Literal["dress", "top", "bottom", "shoes", "accessory"]
    image_base64: str  # data url or raw base64


class ReferencePhotoCreate(BaseModel):
    name: Optional[str] = None
    image_base64: str


class TryOnRequest(BaseModel):
    reference_photo_id: str
    wardrobe_item_id: str
    hairstyle: str


class LoveNoteCreate(BaseModel):
    text: str


# ---- Startup: Seed Users ----
@app.on_event("startup")
async def seed_users():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)

    existing_admin = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing_admin:
        await db.users.insert_one(
            {
                "id": str(uuid.uuid4()),
                "email": ADMIN_EMAIL,
                "password_hash": hash_password(ADMIN_PASSWORD),
                "role": "admin",
                "display_name": "Admin",
                "created_at": now_iso(),
            }
        )
        logger.info(f"Seeded admin user: {ADMIN_EMAIL}")
    else:
        await db.users.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD), "role": "admin"}},
        )

    existing_partner = await db.users.find_one({"email": PARTNER_EMAIL})
    if not existing_partner:
        await db.users.insert_one(
            {
                "id": str(uuid.uuid4()),
                "email": PARTNER_EMAIL,
                "password_hash": hash_password(PARTNER_PASSWORD),
                "role": "partner",
                "display_name": "Her",
                "created_at": now_iso(),
            }
        )
        logger.info(f"Seeded partner user: {PARTNER_EMAIL}")
    else:
        await db.users.update_one(
            {"email": PARTNER_EMAIL},
            {
                "$set": {
                    "password_hash": hash_password(PARTNER_PASSWORD),
                    "role": "partner",
                }
            },
        )


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# ---- Routes ----
@api_router.get("/")
async def root():
    return {"app": "her-closet", "status": "ok"}


@api_router.post("/auth/login")
async def login(req: LoginRequest):
    user = await db.users.find_one({"email": req.email.lower().strip()})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(user["id"], user["role"], user["email"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "display_name": user.get("display_name", ""),
        },
    }


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# Wardrobe
@api_router.post("/wardrobe")
async def create_wardrobe_item(
    item: WardrobeItemCreate, user: dict = Depends(get_current_user)
):
    doc = {
        "id": str(uuid.uuid4()),
        "name": item.name,
        "category": item.category,
        "image_base64": item.image_base64,
        "created_by": user["id"],
        "created_at": now_iso(),
    }
    await db.wardrobe.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/wardrobe")
async def list_wardrobe(user: dict = Depends(get_current_user)):
    items = await db.wardrobe.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


@api_router.delete("/wardrobe/{item_id}")
async def delete_wardrobe(item_id: str, user: dict = Depends(get_current_user)):
    result = await db.wardrobe.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"ok": True}


# Reference photos
@api_router.post("/references")
async def create_reference(
    ref: ReferencePhotoCreate, user: dict = Depends(get_current_user)
):
    doc = {
        "id": str(uuid.uuid4()),
        "name": ref.name or "Reference",
        "image_base64": ref.image_base64,
        "created_by": user["id"],
        "created_at": now_iso(),
    }
    await db.references.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/references")
async def list_references(user: dict = Depends(get_current_user)):
    items = (
        await db.references.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    )
    return items


@api_router.delete("/references/{ref_id}")
async def delete_reference(ref_id: str, user: dict = Depends(get_current_user)):
    result = await db.references.delete_one({"id": ref_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reference not found")
    return {"ok": True}


# ---- Image gen helper ----
def _strip_data_url(b64: str) -> str:
    if b64.startswith("data:"):
        return b64.split(",", 1)[1]
    return b64


async def generate_tryon_image(
    reference_b64: str,
    clothing_b64: str,
    clothing_name: str,
    category: str,
    hairstyle: str,
) -> str:
    """Returns base64 PNG of generated try-on image."""
    ref_clean = _strip_data_url(reference_b64)
    cloth_clean = _strip_data_url(clothing_b64)

    prompt = (
        "TASK: Virtual try-on. You are given TWO input images.\n"
        "- IMAGE 1 = the person (reference photo). This is the subject.\n"
        f"- IMAGE 2 = a {category} garment called '{clothing_name}'. This is the clothing to be worn.\n\n"
        "STRICT PRESERVATION RULES — do NOT change any of the following from IMAGE 1:\n"
        "1. The person's face must be IDENTICAL — same facial features, eyes, nose, mouth shape, jawline, skin tone, freckles, and expression. Do not beautify, smooth, slim, or alter the face in any way. Match the face pixel-perfect.\n"
        "2. Body proportions, height, build, and posture must be preserved exactly.\n"
        "3. Skin tone across the whole body must match the reference.\n"
        "4. Keep the full body in frame — head to feet, no cropping.\n\n"
        f"WHAT TO CHANGE:\n"
        f"- Replace ONLY the {category} on her body with the exact garment from IMAGE 2. "
        f"Preserve the garment's color, pattern, fabric, cut, length, and details faithfully.\n"
        f"- Style her hair as: {hairstyle}.\n\n"
        "OUTPUT REQUIREMENTS:\n"
        "Return a single photorealistic image only."
    )

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        "gemini-3-pro-image:generateContent"
    )
    headers = {"x-goog-api-key": GEMINI_API_KEY, "Content-Type": "application/json"}
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": "image/jpeg", "data": ref_clean}},
                    {"inline_data": {"mime_type": "image/jpeg", "data": cloth_clean}},
                ]
            }
        ],
        "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]},
    }

    resp = await asyncio.to_thread(
        http_requests.post, url, headers=headers, json=payload, timeout=60
    )
    if resp.status_code != 200:
        logger.error(f"Gemini API error {resp.status_code}: {resp.text}")
        raise HTTPException(
            status_code=502, detail=f"Gemini API error: {resp.text[:300]}"
        )
    data = resp.json()

    parts = data["candidates"][0]["content"]["parts"]
    for part in parts:
        inline = part.get("inlineData") or part.get("inline_data")
        if inline and inline.get("data"):
            return inline["data"]

    raise HTTPException(
        status_code=502, detail="Image generation returned no image data"
    )


# Try-on
@api_router.post("/tryon")
async def create_tryon(req: TryOnRequest, user: dict = Depends(get_current_user)):
    ref = await db.references.find_one({"id": req.reference_photo_id}, {"_id": 0})
    if not ref:
        raise HTTPException(status_code=404, detail="Reference photo not found")
    item = await db.wardrobe.find_one({"id": req.wardrobe_item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Wardrobe item not found")

    generated_b64 = await generate_tryon_image(
        reference_b64=ref["image_base64"],
        clothing_b64=item["image_base64"],
        clothing_name=item["name"],
        category=item["category"],
        hairstyle=req.hairstyle,
    )

    ts = now_iso()
    doc = {
        "id": str(uuid.uuid4()),
        "reference_photo_id": req.reference_photo_id,
        "wardrobe_item_id": req.wardrobe_item_id,
        "wardrobe_item_name": item["name"],
        "wardrobe_item_category": item["category"],
        "hairstyle": req.hairstyle,
        "result_image_base64": generated_b64,
        "created_by": user["id"],
        "created_by_email": user["email"],
        "created_at": ts,
    }
    await db.tryons.insert_one(doc)

    # Send email notification (non-blocking, never raises)
    asyncio.create_task(
        asyncio.to_thread(
            send_activity_email, user["email"], item["name"], req.hairstyle, ts
        )
    )

    doc.pop("_id", None)
    return doc


@api_router.get("/tryon")
async def list_tryons(user: dict = Depends(get_current_user)):
    items = await db.tryons.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


@api_router.delete("/tryon/{tid}")
async def delete_tryon(tid: str, user: dict = Depends(get_current_user)):
    result = await db.tryons.delete_one({"id": tid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Try-on not found")
    return {"ok": True}


# Love notes
@api_router.post("/notes")
async def create_note(note: LoveNoteCreate, user: dict = Depends(require_admin)):
    doc = {
        "id": str(uuid.uuid4()),
        "text": note.text,
        "created_at": now_iso(),
        "read_by": [],
    }
    await db.notes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/notes")
async def list_notes(user: dict = Depends(get_current_user)):
    items = await db.notes.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return items


@api_router.get("/notes/latest-unread")
async def latest_unread_note(user: dict = Depends(get_current_user)):
    if user.get("role") == "admin":
        return {"note": None}
    note = await db.notes.find_one(
        {"read_by": {"$nin": [user["id"]]}}, {"_id": 0}, sort=[("created_at", -1)]
    )
    return {"note": note}


@api_router.post("/notes/{note_id}/read")
async def mark_note_read(note_id: str, user: dict = Depends(get_current_user)):
    await db.notes.update_one({"id": note_id}, {"$addToSet": {"read_by": user["id"]}})
    return {"ok": True}


@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str, user: dict = Depends(require_admin)):
    result = await db.notes.delete_one({"id": note_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"ok": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error on {request.method} {request.url.path}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )
