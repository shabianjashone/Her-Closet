import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Heart } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email.trim().toLowerCase(), password);
      toast.success("Welcome back");
      navigate("/", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Could not sign in");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row" data-testid="login-page">
      <div
        className="hidden md:block md:w-1/2 bg-cover bg-center"
        style={{ backgroundImage: "url(https://images.unsplash.com/photo-1710162734106-6932b5799f99?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1NzV8MHwxfHNlYXJjaHwxfHxyb21hbnRpYyUyMG1pbmltYWwlMjBhYnN0cmFjdCUyMHBhc3RlbCUyMGJhY2tncm91bmR8ZW58MHx8fHwxNzgxOTYzMTM5fDA&ixlib=rb-4.1.0&q=85)" }}
      />
      <div className="flex-1 flex items-center justify-center p-8 fade-up">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10 text-[#CB997E]">
            <Heart size={20} strokeWidth={1.5} fill="#CB997E" />
            <span className="text-xs uppercase tracking-[0.3em] font-bold text-[#8D6E63]">Her Closet</span>
          </div>
          <h1 className="font-serif-display text-5xl text-[#3E2723] leading-tight mb-3">
            A private corner,<br /> just for us.
          </h1>
          <p className="text-sm text-[#8D6E63] mb-10 leading-relaxed">
            Sign in to your shared wardrobe.
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#8D6E63] mb-2">Email</label>
              <input
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-[#FDFBF7] border border-[#EBE5DA] rounded-2xl px-4 py-3 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#CB997E]/30 focus:border-[#CB997E] transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.2em] text-[#8D6E63] mb-2">Password</label>
              <input
                data-testid="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-[#FDFBF7] border border-[#EBE5DA] rounded-2xl px-4 py-3 text-[#3E2723] focus:outline-none focus:ring-2 focus:ring-[#CB997E]/30 focus:border-[#CB997E] transition"
              />
            </div>
            <button
              data-testid="login-submit-button"
              type="submit"
              disabled={submitting}
              className="w-full bg-[#CB997E] text-white rounded-full px-6 py-3.5 font-medium transition-all hover:bg-[#B58368] hover:shadow-lg disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
