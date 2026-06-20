import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Trash2, X } from "lucide-react";

export default function History() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(null);

  const load = () => api.get("/tryon").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);

  const remove = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this try-on?")) return;
    await api.delete(`/tryon/${id}`);
    load();
  };

  const fmtDate = (iso) => {
    try { return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
    catch { return iso; }
  };

  const src = (b64) => (b64?.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`);

  return (
    <div data-testid="history-page">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#8D6E63] mb-2">Try-on history</p>
      <h1 className="font-serif-display text-4xl sm:text-5xl text-[#3E2723] mb-10">Looks she&apos;s tried.</h1>

      {items.length === 0 ? (
        <div data-testid="history-empty" className="rounded-3xl bg-white p-10 text-center border border-[#EBE5DA]">
          <p className="font-serif-display text-2xl text-[#3E2723] mb-2">Nothing here yet.</p>
          <p className="text-sm text-[#8D6E63]">Generated try-ons will show up here automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
          {items.map((t) => (
            <button
              key={t.id}
              data-testid="history-card"
              onClick={() => setOpen(t)}
              className="group text-left"
            >
              <div className="relative overflow-hidden rounded-2xl bg-[#F4EFE6] aspect-[3/4] mb-3">
                <img src={src(t.result_image_base64)} alt={t.wardrobe_item_name} className="w-full h-full object-cover transition group-hover:scale-[1.02]" />
                <button
                  data-testid="history-delete"
                  onClick={(e) => remove(t.id, e)}
                  className="absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur opacity-0 group-hover:opacity-100 transition text-[#3E2723] hover:bg-white"
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#8D6E63] mb-1">{t.hairstyle}</p>
              <p className="text-sm text-[#3E2723] truncate">{t.wardrobe_item_name}</p>
              <p className="text-xs text-[#8D6E63] mt-0.5">{fmtDate(t.created_at)}</p>
            </button>
          ))}
        </div>
      )}

      {open && (
        <div
          data-testid="history-modal"
          className="fixed inset-0 bg-[#3E2723]/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setOpen(null)}
        >
          <div className="bg-white rounded-3xl p-4 md:p-6 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#8D6E63]">{open.wardrobe_item_category} • {open.hairstyle}</p>
                <h3 className="font-serif-display text-2xl text-[#3E2723]">{open.wardrobe_item_name}</h3>
                <p className="text-xs text-[#8D6E63] mt-1">{fmtDate(open.created_at)}</p>
              </div>
              <button data-testid="history-modal-close" onClick={() => setOpen(null)} className="p-2 rounded-full hover:bg-[#F4EFE6] text-[#8D6E63]">
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-[#F4EFE6]">
              <img src={src(open.result_image_base64)} alt={open.wardrobe_item_name} className="w-full h-auto" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
