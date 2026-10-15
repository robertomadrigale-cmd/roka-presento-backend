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
          <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white shadow-sm group-hover:scale-110 group-hover:shadow-blue-500/25 group-hover:shadow-lg transition-all duration-300">
            <Sparkles size={15} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform duration-300" />
            {/* Subtle glow on hover */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 opacity-0 group-hover:opacity-40 blur-lg transition-opacity duration-300 -z-10" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-[17px] tracking-tight group-hover:tracking-normal transition-all duration-300">Presento</span>
            <span className="text-[9px] font-mono text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 tracking-wider">AI</span>
          </div>
        </div>
        <nav className="flex items-center gap-1.5">
          {onOpenSettings && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenSettings}
              className="rounded-lg gap-2 text-neutral-700 hover:text-neutral-900 group/settings"
              data-testid="navbar-ai-settings"
            >
              <Settings size={15} strokeWidth={1.75} className="group-hover/settings:rotate-90 transition-transform duration-500" />
              <span className="hidden md:inline text-sm">Configurar IA</span>
            </Button>
          )}
          {user ? (
            <>
              <div className="hidden md:flex items-center gap-2 pl-3 mr-1 border-l border-neutral-200">
                {user.picture && (
                  <img
                    src={user.picture}
                    alt=""
                    className="w-7 h-7 rounded-full ring-2 ring-white soft-shadow"
                  />
                )}
                <span className="text-sm text-neutral-700 max-w-[160px] truncate">{user.email}</span>
              </div>
              <Button
                onClick={logout}
                variant="ghost"
                size="sm"
                className="rounded-lg text-neutral-700 hover:text-red-600 gap-2 group/logout"
                data-testid="navbar-logout"
              >
                <LogOut size={15} strokeWidth={1.75} className="group-hover/logout:translate-x-0.5 transition-transform" />
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
              className="rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-sm soft-shadow hover:soft-shadow-lg transition-all"
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
