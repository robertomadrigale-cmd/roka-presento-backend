import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Landing from "./pages/Landing";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Create from "./pages/Create";
import Editor from "./pages/Editor";

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center font-mono text-sm tracking-[0.3em]">CARGANDO…</div>;
  if (!user) return <Navigate to="/" replace />;
  return children;
};

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/create" element={<Protected><Create /></Protected>} />
      <Route path="/editor/:id" element={<Protected><Editor /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
