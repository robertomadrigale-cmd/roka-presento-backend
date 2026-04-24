import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback() {
  const nav = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    if (!m) { nav("/"); return; }
    const session_id = m[1];
    (async () => {
      try {
        const { data } = await api.post("/auth/session", { session_id });
        setUser(data.user);
        window.history.replaceState({}, "", "/dashboard");
        nav("/dashboard", { state: { user: data.user }, replace: true });
      } catch (e) {
        console.error(e);
        nav("/", { replace: true });
      }
    })();
  }, [nav, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="font-mono text-sm tracking-[0.3em] animate-pulse">CONECTANDO…</div>
    </div>
  );
}
