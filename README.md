# Her Closet

A private, two-user virtual wardrobe + AI try-on web app. Built with FastAPI + React + MongoDB. Uses Gemini Nano Banana (`gemini-3.1-flash-image-preview`) via the Emergent Universal LLM key for try-on generation, and Resend for activity emails.

## Stack
- **Backend**: FastAPI, MongoDB (motor), JWT (PyJWT + bcrypt), emergentintegrations, Resend.
- **Frontend**: React 19, React Router, Tailwind, sonner.
- **Image gen model**: Gemini Nano Banana (`gemini-3.1-flash-image-preview`).

## Quick start (local)

### Prereqs
- Python 3.11+
- Node 18+ and Yarn
- MongoDB running locally (`mongodb://localhost:27017`)

### Backend
```bash
cd backend
cp .env.example .env       # then fill in EMERGENT_LLM_KEY, JWT_SECRET, RESEND_API_KEY
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```
On first startup, two users are auto-seeded from `.env`:
- `admin@hercloset.local` / `adminpass123` (role: admin)
- `her@hercloset.local` / `herpass123` (role: partner)

Change them in `.env` and restart — the seed is idempotent and re-syncs the passwords on every restart.

### Frontend
```bash
cd frontend
cp .env.example .env       # set REACT_APP_BACKEND_URL=http://localhost:8001
yarn install
yarn start
```
Open http://localhost:3000 and sign in with the seeded creds.

## Features
- **Auth**: JWT-based, two pre-seeded users only (no signup).
- **Wardrobe**: upload clothing items with category (dress / top / bottom / shoes / accessory) + name. Filter by category.
- **Reference photos**: upload one or more full-body photos of her.
- **Virtual try-on**: pick a reference photo + a clothing item + hairstyle (preset or custom). Generates a photorealistic image. Loading state shown.
- **Try-on history**: all generated looks saved to a gallery; click to view full size + download.
- **Love notes**: only admin can post short notes; partner sees the most recent unread note as a popup banner on app open. Closing the banner marks it as read.
- **Activity email**: every time a partner generates a try-on, an email is sent to `ADMIN_NOTIFY_EMAIL` via Resend (silently skipped if no API key is set).

## Environment variables
See `backend/.env.example` and `frontend/.env.example`.

| Var | Purpose |
|---|---|
| `MONGO_URL` | MongoDB connection string |
| `DB_NAME` | DB name |
| `EMERGENT_LLM_KEY` | Emergent Universal LLM key (Gemini Nano Banana) |
| `JWT_SECRET` | JWT signing secret (rotate before production!) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin login (re-synced on startup) |
| `PARTNER_EMAIL` / `PARTNER_PASSWORD` | Partner login (re-synced on startup) |
| `ADMIN_NOTIFY_EMAIL` | Inbox that receives try-on notifications |
| `RESEND_API_KEY` | Resend key (leave blank to disable email) |
| `SENDER_EMAIL` | "From" address (must be a verified Resend sender) |

## API summary
All routes are prefixed with `/api`. All non-auth routes require `Authorization: Bearer <token>`.

- `POST /api/auth/login` → `{ token, user }`
- `GET  /api/auth/me`
- `GET/POST/DELETE /api/wardrobe[/{id}]`
- `GET/POST/DELETE /api/references[/{id}]`
- `POST /api/tryon` (generates + saves), `GET /api/tryon`, `DELETE /api/tryon/{id}`
- `POST /api/notes` (admin only), `GET /api/notes`, `DELETE /api/notes/{id}` (admin only)
- `GET /api/notes/latest-unread`, `POST /api/notes/{id}/read`

## Project structure
```
backend/
  server.py             # All routes + seed users + image-gen + email
  requirements.txt
  .env.example
frontend/
  src/
    App.js              # Routes
    lib/api.js          # axios + auth interceptor
    lib/auth.jsx        # AuthProvider
    lib/img.js          # base64 helpers
    pages/
      Login.jsx
      Layout.jsx        # Nav (desktop + mobile)
      LoveNoteBanner.jsx
      Wardrobe.jsx
      References.jsx
      TryOn.jsx
      History.jsx
      Notes.jsx
    components/ui/      # shadcn primitives
    index.css           # Design tokens (Cormorant Garamond + Manrope)
  .env.example
README.md
```

## Notes
- Images are stored as base64 in MongoDB. Fine at personal scale; consider object storage if the collection grows large.
- `RESEND_API_KEY` blank = email sending is silently skipped (logged warning). Add a Resend key + verified sender domain to enable.
- The try-on prompt is tuned for strict face/body preservation. Better reference photos = better results (clear lighting, single subject, head-to-toe).
