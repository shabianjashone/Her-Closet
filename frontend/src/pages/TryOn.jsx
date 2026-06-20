import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Sparkles, Check, Download } from "lucide-react";
import { toast } from "sonner";

const HAIRSTYLES = ["Down", "Bun", "Ponytail", "Braid", "Half-up"];

export default function TryOn() {
  const [refs, setRefs] = useState([]);
  const [items, setItems] = useState([]);
  const [refId, setRefId] = useState("");
  const [itemId, setItemId] = useState("");
  const [hair, setHair] = useState("Down");
  const [hairCustom, setHairCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    Promise.all([api.get("/references"), api.get("/wardrobe")]).then(([r, w]) => {
      setRefs(r.data);
      setItems(w.data);
    });
  }, []);

  const finalHair = hair === "Custom" ? hairCustom.trim() : hair;

  const submit = async () => {
    if (!refId) { toast.error("Pick a reference photo"); return; }
    if (!itemId) { toast.error("Pick a clothing item"); return; }
    if (!finalHair) { toast.error("Pick a hairstyle"); return; }
    setLoading(true);
    setResult(null);
    try {
      const r = await api.post("/tryon", {
        reference_photo_id: refId,
        wardrobe_item_id: itemId,
        hairstyle: finalHair,
      });
      setResult(r.data);
      toast.success("Try-on ready");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!result) return;
    const src = result.result_image_base64.startsWith("data:")
      ? result.result_image_base64
      : `data:image/png;base64,${result.result_image_base64}`;
    const a = document.createElement("a");
    a.href = src;
    a.download = `tryon-${result.wardrobe_item_name}.png`;
    a.click();
  };

  return (
    <div data-testid="tryon-page">
      <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#8D6E63] mb-2">Virtual try-on</p>
      <h1 className="font-serif-display text-4xl sm:text-5xl text-[#3E2723] mb-10">Try something on.</h1>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Selection */}
        <div className="space-y-8">
          <Section title="1. Your photo">
            {refs.length === 0 ? (
              <p className="text-sm text-[#8D6E63]">No reference photos yet. Add one in <strong>Photos</strong>.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {refs.map((r) => (
                  <button
                    key={r.id}
                    data-testid={`tryon-ref-${r.id}`}
                    onClick={() => setRefId(r.id)}
                    className={`relative aspect-[3/4] rounded-2xl overflow-hidden transition-all ${
                      refId === r.id ? "ring-2 ring-[#CB997E] ring-offset-2 ring-offset-[#FAF9F6]" : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    <img src={r.image_base64} alt={r.name} className="w-full h-full object-cover" />
                    {refId === r.id && (
                      <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#CB997E] flex items-center justify-center">
                        <Check size={14} className="text-white" strokeWidth={2} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </Section>

          <Section title="2. The item">
            {items.length === 0 ? (
              <p className="text-sm text-[#8D6E63]">No items yet. Add some in <strong>Wardrobe</strong>.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
                {items.map((i) => (
                  <button
                    key={i.id}
                    data-testid={`tryon-item-${i.id}`}
                    onClick={() => setItemId(i.id)}
                    className={`relative aspect-[3/4] rounded-2xl overflow-hidden transition-all ${
                      itemId === i.id ? "ring-2 ring-[#CB997E] ring-offset-2 ring-offset-[#FAF9F6]" : "opacity-80 hover:opacity-100"
                    }`}
                  >
                    <img src={i.image_base64} alt={i.name} className="w-full h-full object-cover" />
                    {itemId === i.id && (
                      <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#CB997E] flex items-center justify-center">
                        <Check size={14} className="text-white" strokeWidth={2} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </Section>

          <Section title="3. Hairstyle">
            <div className="flex flex-wrap gap-2">
              {HAIRSTYLES.map((h) => (
                <button
                  key={h}
                  data-testid={`tryon-hair-${h.toLowerCase()}`}
                  onClick={() => setHair(h)}
                  className={`px-4 py-2 rounded-full text-sm transition ${
                    hair === h ? "bg-[#3E2723] text-white" : "bg-[#F4EFE6] text-[#8D6E63] hover:bg-[#EBE5DA]"
                  }`}
                >
                  {h}
                </button>
              ))}
              <button
                data-testid="tryon-hair-custom"
                onClick={() => setHair("Custom")}
                className={`px-4 py-2 rounded-full text-sm transition ${
                  hair === "Custom" ? "bg-[#3E2723] text-white" : "bg-[#F4EFE6] text-[#8D6E63] hover:bg-[#EBE5DA]"
                }`}
              >
                Custom
              </button>
            </div>
            {hair === "Custom" && (
              <input
                data-testid="tryon-hair-custom-input"
                value={hairCustom}
                onChange={(e) => setHairCustom(e.target.value)}
                placeholder="Describe a hairstyle…"
                className="mt-3 w-full bg-[#FDFBF7] border border-[#EBE5DA] rounded-2xl px-4 py-3 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#CB997E]/30"
              />
            )}
          </Section>

          <button
            data-testid="tryon-generate-button"
            onClick={submit}
            disabled={loading}
            className="w-full bg-[#CB997E] text-white rounded-full px-6 py-4 font-medium transition-all hover:bg-[#B58368] hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Sparkles size={18} strokeWidth={1.5} />
            {loading ? "Conjuring your look…" : "Try it on"}
          </button>
        </div>

        {/* Result */}
        <div className="md:sticky md:top-24 self-start">
          <div className="rounded-3xl bg-white border border-[#EBE5DA] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#8D6E63] mb-4">Result</p>
            <div className="aspect-[3/4] rounded-2xl bg-[#F4EFE6] overflow-hidden flex items-center justify-center" data-testid="tryon-result">
              {loading ? (
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FDF5F5] to-[#CB997E] soft-pulse mx-auto mb-4" />
                  <p className="font-serif-display italic text-[#8D6E63]">Styling, one stitch at a time…</p>
                </div>
              ) : result ? (
                <img
                  src={result.result_image_base64.startsWith("data:") ? result.result_image_base64 : `data:image/png;base64,${result.result_image_base64}`}
                  alt="Try-on result"
                  className="w-full h-full object-cover"
                  data-testid="tryon-result-image"
                />
              ) : (
                <p className="text-sm text-[#8D6E63] px-6 text-center">Your generated look will appear here.</p>
              )}
            </div>
            {result && !loading && (
              <button
                data-testid="tryon-download"
                onClick={download}
                className="mt-4 w-full bg-[#F4EFE6] text-[#3E2723] rounded-full px-6 py-3 font-medium hover:bg-[#EBE5DA] inline-flex items-center justify-center gap-2"
              >
                <Download size={16} strokeWidth={1.5} /> Save image
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8D6E63] mb-3">{title}</p>
      {children}
    </div>
  );
}
