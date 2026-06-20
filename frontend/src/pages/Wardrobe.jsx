import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { fileToBase64 } from "../lib/img";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "dress", label: "Dress" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "shoes", label: "Shoes" },
  { value: "accessory", label: "Accessory" },
];

export default function Wardrobe() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("dress");
  const [imageB64, setImageB64] = useState("");
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");
  const fileRef = useRef(null);

  const load = () => {
    setLoading(true);
    api.get("/wardrobe").then((r) => setItems(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const b64 = await fileToBase64(f);
    setImageB64(b64);
  };

  const reset = () => {
    setName(""); setCategory("dress"); setImageB64(""); setOpen(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const save = async () => {
    if (!name.trim() || !imageB64) {
      toast.error("Add a name and a photo");
      return;
    }
    setSaving(true);
    try {
      await api.post("/wardrobe", { name: name.trim(), category, image_base64: imageB64 });
      toast.success("Added to wardrobe");
      reset();
      load();
    } catch (e) {
      toast.error("Could not save");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this item?")) return;
    await api.delete(`/wardrobe/${id}`);
    load();
  };

  const visible = filter === "all" ? items : items.filter((i) => i.category === filter);

  return (
    <div data-testid="wardrobe-page">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#8D6E63] mb-2">Her Closet</p>
          <h1 className="font-serif-display text-4xl sm:text-5xl text-[#3E2723]">Wardrobe</h1>
        </div>
        <button
          data-testid="wardrobe-add-button"
          onClick={() => setOpen(true)}
          className="bg-[#CB997E] text-white rounded-full px-5 py-3 font-medium transition-all hover:bg-[#B58368] hover:shadow-lg flex items-center gap-2"
        >
          <Plus size={18} strokeWidth={1.5} /> <span className="hidden sm:inline">Add item</span>
        </button>
      </div>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
        {[{ value: "all", label: "All" }, ...CATEGORIES].map((c) => (
          <button
            key={c.value}
            data-testid={`wardrobe-filter-${c.value}`}
            onClick={() => setFilter(c.value)}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition ${
              filter === c.value ? "bg-[#3E2723] text-white" : "bg-[#F4EFE6] text-[#8D6E63] hover:bg-[#EBE5DA]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-[#8D6E63]">Loading…</p>
      ) : visible.length === 0 ? (
        <EmptyState onAdd={() => setOpen(true)} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
          {visible.map((i) => (
            <div key={i.id} data-testid="wardrobe-item-card" className="group">
              <div className="relative overflow-hidden rounded-2xl bg-[#F4EFE6] aspect-[3/4] mb-3">
                <img src={i.image_base64} alt={i.name} className="w-full h-full object-cover transition group-hover:scale-[1.02]" />
                <button
                  data-testid="wardrobe-item-delete"
                  onClick={() => remove(i.id)}
                  className="absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur opacity-0 group-hover:opacity-100 transition text-[#3E2723] hover:bg-white"
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#8D6E63] mb-1">{i.category}</p>
              <p className="text-sm text-[#3E2723] truncate">{i.name}</p>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal onClose={reset} title="Add to wardrobe">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#8D6E63] mb-2">Photo</label>
              <input
                ref={fileRef}
                data-testid="wardrobe-upload-input"
                type="file"
                accept="image/*"
                onChange={onFile}
                className="block w-full text-sm text-[#3E2723] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-[#F4EFE6] file:text-[#3E2723] file:cursor-pointer"
              />
              {imageB64 && (
                <div className="mt-3 rounded-2xl overflow-hidden bg-[#F4EFE6] aspect-[3/4] max-w-[180px]">
                  <img src={imageB64} alt="preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#8D6E63] mb-2">Name</label>
              <input
                data-testid="wardrobe-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Linen sundress"
                className="w-full bg-[#FDFBF7] border border-[#EBE5DA] rounded-2xl px-4 py-3 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#CB997E]/30 focus:border-[#CB997E]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#8D6E63] mb-2">Category</label>
              <select
                data-testid="wardrobe-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#FDFBF7] border border-[#EBE5DA] rounded-2xl px-4 py-3 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#CB997E]/30"
              >
                {CATEGORIES.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
              </select>
            </div>
            <button
              data-testid="wardrobe-save-button"
              onClick={save}
              disabled={saving}
              className="w-full bg-[#CB997E] text-white rounded-full px-6 py-3 font-medium transition-all hover:bg-[#B58368] disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save to wardrobe"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div data-testid="wardrobe-empty" className="rounded-3xl bg-white p-10 text-center border border-[#EBE5DA]">
      <div className="w-24 h-24 mx-auto mb-6 rounded-2xl overflow-hidden bg-[#F4EFE6]">
        <img
          src="https://images.pexels.com/photos/7671167/pexels-photo-7671167.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
          alt=""
          className="w-full h-full object-cover opacity-90"
        />
      </div>
      <p className="font-serif-display text-2xl text-[#3E2723] mb-2">Your closet is bare.</p>
      <p className="text-sm text-[#8D6E63] mb-6">Add a few favorite pieces to start trying things on.</p>
      <button
        data-testid="wardrobe-empty-add"
        onClick={onAdd}
        className="bg-[#CB997E] text-white rounded-full px-6 py-3 font-medium hover:bg-[#B58368] inline-flex items-center gap-2"
      >
        <Upload size={16} strokeWidth={1.5} /> Add first item
      </button>
    </div>
  );
}

function Modal({ children, title, onClose }) {
  return (
    <div
      data-testid="modal-overlay"
      className="fixed inset-0 bg-[#3E2723]/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-serif-display text-2xl text-[#3E2723]">{title}</h2>
          <button data-testid="modal-close" onClick={onClose} className="p-2 rounded-full hover:bg-[#F4EFE6] text-[#8D6E63]">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
