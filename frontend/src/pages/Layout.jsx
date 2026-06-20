import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Heart, Shirt, Camera, Sparkles, Image as ImageIcon, ScrollText, LogOut } from "lucide-react";
import LoveNoteBanner from "./LoveNoteBanner";

const NAV = [
  { to: "/wardrobe", label: "Wardrobe", icon: Shirt, testid: "nav-wardrobe" },
  { to: "/references", label: "Photos", icon: Camera, testid: "nav-references" },
  { to: "/tryon", label: "Try On", icon: Sparkles, testid: "nav-tryon" },
  { to: "/history", label: "History", icon: ImageIcon, testid: "nav-history" },
  { to: "/notes", label: "Notes", icon: ScrollText, testid: "nav-notes" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-24 md:pb-0" data-testid="app-layout">
      <LoveNoteBanner />

      {/* Desktop nav */}
      <header className="hidden md:flex sticky top-0 w-full bg-[#FAF9F6]/85 backdrop-blur-xl border-b border-[#EBE5DA] px-8 py-4 justify-between items-center z-40">
        <div className="flex items-center gap-2 text-[#CB997E]">
          <Heart size={18} strokeWidth={1.5} fill="#CB997E" />
          <span className="text-xs uppercase tracking-[0.3em] font-bold text-[#8D6E63]">Her Closet</span>
        </div>
        <nav className="flex gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={n.testid}
              className={({ isActive }) =>
                `px-4 py-2 rounded-full text-sm transition-all ${
                  isActive ? "bg-[#F4EFE6] text-[#3E2723] font-medium" : "text-[#8D6E63] hover:text-[#3E2723]"
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#8D6E63]">{user?.email}</span>
          <button
            data-testid="logout-button"
            onClick={handleLogout}
            className="p-2 rounded-full hover:bg-[#F4EFE6] text-[#8D6E63]"
            title="Sign out"
          >
            <LogOut size={18} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 md:p-10 fade-up">
        <Outlet />
      </main>

      {/* Mobile nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-[#EBE5DA] flex justify-around items-center py-2 pb-safe z-40">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            data-testid={`mobile-${n.testid}`}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-2 py-2 rounded-2xl transition ${
                isActive ? "text-[#CB997E]" : "text-[#8D6E63]"
              }`
            }
          >
            <n.icon size={20} strokeWidth={1.5} />
            <span className="text-[10px] tracking-wide">{n.label}</span>
          </NavLink>
        ))}
        <button
          data-testid="mobile-logout-button"
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 px-2 py-2 text-[#8D6E63]"
        >
          <LogOut size={20} strokeWidth={1.5} />
          <span className="text-[10px] tracking-wide">Exit</span>
        </button>
      </nav>
    </div>
  );
}
