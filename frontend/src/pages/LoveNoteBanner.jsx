import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { X, Heart } from "lucide-react";

export default function LoveNoteBanner() {
  const { user } = useAuth();
  const [note, setNote] = useState(null);

  useEffect(() => {
    if (!user || user.role === "admin") return;
    api.get("/notes/latest-unread")
      .then((r) => setNote(r.data?.note || null))
      .catch(() => {});
  }, [user]);

  if (!note) return null;

  const close = async () => {
    try { await api.post(`/notes/${note.id}/read`); } catch (_e) { /* ignore */ }
    setNote(null);
  };

  return (
    <div
      data-testid="love-note-banner"
      className="fixed top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:max-w-xl z-50 bg-white p-6 rounded-3xl shadow-[0_12px_40px_rgba(203,153,126,0.18)] border border-[#FDF5F5] slide-down"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-[#FDF5F5] flex items-center justify-center flex-shrink-0">
          <Heart size={18} strokeWidth={1.5} fill="#CB997E" className="text-[#CB997E]" />
        </div>
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#8D6E63] mb-2">A note for you</p>
          <p className="font-serif-display text-xl italic text-[#3E2723] leading-snug">{note.text}</p>
        </div>
        <button
          data-testid="love-note-close"
          onClick={close}
          className="p-1.5 rounded-full hover:bg-[#F4EFE6] text-[#8D6E63] flex-shrink-0"
          aria-label="Close"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
