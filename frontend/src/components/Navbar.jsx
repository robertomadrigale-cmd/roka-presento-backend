import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";

export default function Navbar({ onOpenSettings }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <header className="border-b border-black bg-white sticky top-0 z-40" data-testid="app-navbar">
      <div className="flex items-center justify-between px-6 md:px-10 h-16">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => nav(user ? "/dashboard" : "/")}
          data-testid="navbar-logo"
        >
          <div className="w-8 h-8 border border-black bg-[#002BFF]"></div>
          <span className="font-display font-semibold text-xl tracking-tight">PRESENTO</span>
          <span className="overline text-[#71717A] hidden md:inline">IA · SLIDES</span>
        </div>
        <nav className="flex items-center gap-2 md:gap-4">
          {onOpenSettings && (
            <Button
              variant="outline"
              onClick={onOpenSettings}
              className="border-black rounded-none font-mono text-xs"
              data-testid="navbar-ai-settings"
            >
              ⚙ IA
            </Button>
          )}
          {user ? (
            <>
              <span className="hidden md:inline font-mono text-xs">{user.email}</span>
              <Button
                onClick={logout}
                className="bg-black text-white rounded-none hover:bg-[#002BFF]"
                data-testid="navbar-logout"
              >
                Cerrar sesión
              </Button>
            </>
          ) : (
            <Button
              onClick={() => {
                // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
                const redirectUrl = window.location.origin + "/dashboard";
                window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
              }}
              className="bg-[#002BFF] text-white rounded-none hover:bg-black"
              data-testid="navbar-login"
            >
              Iniciar sesión →
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
