import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./lib/auth";
import Login from "./pages/Login";
import Layout from "./pages/Layout";
import Wardrobe from "./pages/Wardrobe";
import References from "./pages/References";
import TryOn from "./pages/TryOn";
import History from "./pages/History";
import Notes from "./pages/Notes";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#8D6E63]">…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-center" richColors />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <Protected>
                  <Layout />
                </Protected>
              }
            >
              <Route path="/" element={<Navigate to="/tryon" replace />} />
              <Route path="/wardrobe" element={<Wardrobe />} />
              <Route path="/references" element={<References />} />
              <Route path="/tryon" element={<TryOn />} />
              <Route path="/history" element={<History />} />
              <Route path="/notes" element={<Notes />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
