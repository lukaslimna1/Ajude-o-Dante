"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { logoutAction } from "./auth-actions";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  badge?: string;
  disabled?: boolean;
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/adm",
    icon: "📊",
  },
  {
    label: "Doações e Apoios",
    href: "/adm/doacoes",
    icon: "🐾",
  },
  {
    label: "Ação entre Amigos",
    href: "/adm/acao-entre-amigos",
    icon: "🎟️",
  },
  {
    label: "Atualizações do Dante",
    href: "/adm/atualizacoes",
    icon: "📝",
  },
  {
    label: "Transparência",
    href: "/adm/transparencia",
    icon: "📂",
    badge: "Em breve",
    disabled: true,
  },
];

export default function AdmNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // If on login page, do not render administrative navigation shell
  if (pathname === "/adm/login") {
    return null;
  }

  return (
    <>
      {/* Top Mobile Bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 p-0.5 shrink-0">
            <Image
              src="/images/Usar/Fotos/Dante 07.png"
              alt="Dante"
              width={28}
              height={28}
              className="rounded-md object-cover w-full h-full"
            />
          </div>
          <div>
            <span className="text-sm font-bold text-white block leading-tight">Ajude o Dante</span>
            <span className="text-[10px] text-slate-400 block leading-tight">Painel Administrativo</span>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800/80 border border-slate-700/60"
          aria-label="Abrir menu"
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-950/95 border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-300 backdrop-blur-xl lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400/20 to-sky-500/20 border border-emerald-500/30 p-0.5 shrink-0 shadow-md">
                <Image
                  src="/images/Usar/Fotos/Dante 07.png"
                  alt="Dante"
                  width={36}
                  height={36}
                  className="rounded-lg object-cover w-full h-full"
                />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Ajude o Dante</h2>
                <p className="text-[11px] text-emerald-400 font-medium">ADM v1.0 • Privado</p>
              </div>
            </div>
            {mobileOpen && (
              <button
                onClick={() => setMobileOpen(false)}
                className="lg:hidden text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            )}
          </div>
          <div className="bg-slate-900/90 rounded-lg px-3 py-2 border border-slate-800/80">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">
              Administrador
            </span>
            <span className="text-xs text-slate-300 font-medium truncate block" title={userEmail}>
              {userEmail}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
          <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Módulos do Sistema
          </div>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/adm/atualizacoes" && pathname === "/adm/timeline-transparencia");
            if (item.disabled) {
              return (
                <div
                  key={item.href}
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-slate-500 bg-slate-900/30 border border-transparent opacity-70 cursor-not-allowed text-xs font-medium"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-base opacity-60">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-950/50 font-semibold"
                    : "text-slate-300 hover:text-white hover:bg-slate-900/60 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800/80 space-y-2 bg-slate-950/60">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium border border-slate-800 transition-colors"
          >
            <span>🌐</span> Ver Site Público
          </Link>

          <form action={logoutAction}>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 text-xs font-medium border border-rose-500/20 transition-colors cursor-pointer"
            >
              <span>🚪</span> Sair da Conta
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
