import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Settings, Sparkles, LogOut } from "lucide-react";

export default function Navbar({ onOpenSettings }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <header className="sticky top-0 z-40 glass border-b border-neutral-200/70" data-testid="app-navbar">
      <div className="flex items-center justify-between px-6 md:px-8 h-14">
        <div
          className="flex items-center gap-2.5 cursor-pointer group"
          onClick={() => nav(user ? "/dashboard" : "/")}
          data-testid="navbar-logo"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <Sparkles size={14} strokeWidth={2.5} />
          </div>
          <span className="font-display text-[17px] tracking-tight">Presento</span>
        </div>
        <nav className="flex items-center gap-1.5">
          {onOpenSettings && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenSettings}
              className="rounded-lg gap-2 text-neutral-700 hover:text-neutral-900"
              data-testid="navbar-ai-settings"
            >
              <Settings size={15} strokeWidth={1.75} />
              <span className="hidden md:inline text-sm">Configurar IA</span>
            </Button>
          )}
          {user ? (
            <>
              <div className="hidden md:flex items-center gap-2 pl-3 mr-1 border-l border-neutral-200">
                {user.picture && <img src={user.picture} alt="" className="w-7 h-7 rounded-full" />}
                <span className="text-sm text-neutral-700 max-w-[160px] truncate">{user.email}</span>
              </div>
              <Button
                onClick={logout}
                variant="ghost"
                size="sm"
                className="rounded-lg text-neutral-700 hover:text-red-600 gap-2"
                data-testid="navbar-logout"
              >
                <LogOut size={15} strokeWidth={1.75} />
                <span className="hidden md:inline text-sm">Salir</span>
              </Button>
            </>
          ) : (
            <Button
              onClick={() => {
                // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
                const redirectUrl = window.location.origin + "/dashboard";
                window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
              }}
              size="sm"
              className="rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-sm soft-shadow"
              data-testid="navbar-login"
            >
              Iniciar sesión
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
