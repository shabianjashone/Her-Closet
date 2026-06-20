import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { fileToBase64 } from "../lib/img";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export default function References() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [imageB64, setImageB64] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const load = () => api.get("/references").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImageB64(await fileToBase64(f));
  };

  const reset = () => {
    setName(""); setImageB64(""); setOpen(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const save = async () => {
    if (!imageB64) { toast.error("Pick a photo"); return; }
    setSaving(true);
    try {
      await api.post("/references", { name: name.trim() || "Reference", image_base64: imageB64 });
      toast.success("Photo added");
      reset();
      load();
    } catch {
      toast.error("Could not save");
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Remove this photo?")) return;
    await api.delete(`/references/${id}`);
    load();
  };

  return (
    <div data-testid="references-page">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#8D6E63] mb-2">Reference photos</p>
          <h1 className="font-serif-display text-4xl sm:text-5xl text-[#3E2723]">Your photos</h1>
          <p className="text-sm text-[#8D6E63] mt-2 max-w-md">Full-body, neutral pose works best for try-ons.</p>
        </div>
        <button
          data-testid="references-add-button"
          onClick={() => setOpen(true)}
          className="bg-[#CB997E] text-white rounded-full px-5 py-3 font-medium hover:bg-[#B58368] flex items-center gap-2"
        >
          <Plus size={18} strokeWidth={1.5} /> <span className="hidden sm:inline">Add photo</span>
        </button>
      </div>

      {items.length === 0 ? (
        <div data-testid="references-empty" className="rounded-3xl bg-white p-10 text-center border border-[#EBE5DA]">
          <p className="font-serif-display text-2xl text-[#3E2723] mb-2">No photos yet.</p>
          <p className="text-sm text-[#8D6E63]">Upload one or more reference photos to use for try-ons.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
          {items.map((p) => (
            <div key={p.id} data-testid="reference-card" className="group">
              <div className="relative overflow-hidden rounded-2xl bg-[#F4EFE6] aspect-[3/4] mb-3">
                <img src={p.image_base64} alt={p.name} className="w-full h-full object-cover" />
                <button
                  data-testid="reference-delete"
                  onClick={() => remove(p.id)}
                  className="absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur opacity-0 group-hover:opacity-100 transition text-[#3E2723] hover:bg-white"
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
              <p className="text-sm text-[#3E2723] truncate">{p.name}</p>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 bg-[#3E2723]/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
          onClick={reset}
        >
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-serif-display text-2xl text-[#3E2723]">Add reference photo</h2>
              <button data-testid="references-modal-close" onClick={reset} className="p-2 rounded-full hover:bg-[#F4EFE6] text-[#8D6E63]">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
            <div className="space-y-4">
              <input
                ref={fileRef}
                data-testid="references-upload-input"
                type="file"
                accept="image/*"
                onChange={onFile}
                className="block w-full text-sm text-[#3E2723] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-[#F4EFE6] file:text-[#3E2723] file:cursor-pointer"
              />
              {imageB64 && (
                <div className="rounded-2xl overflow-hidden bg-[#F4EFE6] aspect-[3/4] max-w-[180px]">
                  <img src={imageB64} alt="preview" className="w-full h-full object-cover" />
                </div>
              )}
              <input
                data-testid="references-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional name"
                className="w-full bg-[#FDFBF7] border border-[#EBE5DA] rounded-2xl px-4 py-3 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#CB997E]/30"
              />
              <button
                data-testid="references-save-button"
                onClick={save}
                disabled={saving}
                className="w-full bg-[#CB997E] text-white rounded-full px-6 py-3 font-medium hover:bg-[#B58368] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save photo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
