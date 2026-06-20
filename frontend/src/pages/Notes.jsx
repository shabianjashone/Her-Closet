import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Notes() {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [notes, setNotes] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/notes").then((r) => setNotes(r.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      await api.post("/notes", { text: text.trim() });
      setText("");
      toast.success("Note sent");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not save");
    } finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this note?")) return;
    await api.delete(`/notes/${id}`);
    load();
  };

  const fmt = (iso) => { try { return new Date(iso).toLocaleString(); } catch { return iso; } };
  const isAdmin = user?.role === "admin";

  return (
    <div data-testid="notes-page" className="max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#8D6E63] mb-2">Love notes</p>
      <h1 className="font-serif-display text-4xl sm:text-5xl text-[#3E2723] mb-10">
        {isAdmin ? "Leave her a note." : "Notes from him."}
      </h1>

      {isAdmin && (
        <form onSubmit={submit} className="mb-10">
          <textarea
            data-testid="notes-text-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Something soft, something silly, something true…"
            rows={3}
            className="w-full bg-white border border-[#EBE5DA] rounded-3xl px-5 py-4 text-[#3E2723] font-serif-display text-lg italic placeholder:not-italic placeholder:font-sans placeholder:text-[#8D6E63] placeholder:text-base focus:outline-none focus:ring-2 focus:ring-[#CB997E]/30 focus:border-[#CB997E] resize-none"
          />
          <button
            data-testid="notes-send-button"
            type="submit"
            disabled={saving || !text.trim()}
            className="mt-3 bg-[#CB997E] text-white rounded-full px-6 py-3 font-medium hover:bg-[#B58368] disabled:opacity-60 inline-flex items-center gap-2"
          >
            <Heart size={16} strokeWidth={1.5} fill="white" />
            {saving ? "Sending…" : "Send to her"}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {notes.length === 0 ? (
          <div data-testid="notes-empty" className="rounded-3xl bg-white p-8 text-center border border-[#EBE5DA]">
            <p className="text-sm text-[#8D6E63]">{isAdmin ? "No notes sent yet." : "Nothing yet — but he's thinking of you."}</p>
          </div>
        ) : notes.map((n) => (
          <div key={n.id} data-testid="note-card" className="bg-white rounded-3xl border border-[#EBE5DA] p-6 group">
            <div className="flex items-start justify-between gap-4">
              <p className="font-serif-display text-xl italic text-[#3E2723] leading-snug flex-1">{n.text}</p>
              {isAdmin && (
                <button
                  data-testid="note-delete"
                  onClick={() => remove(n.id)}
                  className="p-2 rounded-full hover:bg-[#F4EFE6] text-[#8D6E63] opacity-0 group-hover:opacity-100 transition flex-shrink-0"
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              )}
            </div>
            <p className="text-xs text-[#8D6E63] mt-3">{fmt(n.created_at)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
