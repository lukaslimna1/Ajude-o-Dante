"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { loginAction } from "../auth-actions";

export default function AdminLoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-sky-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400/20 to-sky-500/20 border border-emerald-500/30 p-1 mb-4 shadow-lg shadow-emerald-950/40">
            <Image
              src="/images/Usar/Fotos/Dante 07.png"
              alt="Dante"
              width={56}
              height={56}
              className="rounded-xl object-cover w-full h-full"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Ajude o Dante</h1>
          <p className="text-sm text-slate-400 mt-1">Painel Administrativo Privado</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/60">
          <h2 className="text-lg font-semibold text-slate-200 mb-2">Entrar no Painel</h2>
          <p className="text-xs text-slate-400 mb-6">
            Acesso exclusivo para o administrador autorizado da campanha.
          </p>

          {state?.error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs leading-relaxed flex items-start gap-2.5">
              <span className="text-rose-400 font-bold shrink-0">⚠️</span>
              <span>{state.error}</span>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="email">
                E-mail Administrativo
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="seu.email@exemplo.com"
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/70 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700/70 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPending ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Validando credenciais...</span>
                </>
              ) : (
                <span>Acessar Painel</span>
              )}
            </button>
          </form>
        </div>

        {/* Return to Public Site */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1.5"
          >
            <span>←</span> Voltar para o site público do Dante
          </Link>
        </div>
      </div>
    </div>
  );
}
