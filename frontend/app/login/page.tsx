"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { auth, DEMO_ALLOWED, login } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof TypeError ? "Não foi possível conectar ao backend." : (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,#0B1B4F_0%,#0B0F19_60%)] p-4">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-5 p-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size={120} showName={false} />
          <div>
            <h1 className="text-lg font-semibold text-white">Painel do Agente de IA</h1>
            <p className="text-sm text-slate-400">Integra Consultoria</p>
          </div>
        </div>
        <div>
          <label htmlFor="pw" className="label">Senha de acesso</label>
          <input id="pw" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required />
        </div>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Entrando…" : "Entrar"}</button>
        {DEMO_ALLOWED && (
          <button type="button" className="btn-ghost w-full" onClick={() => { auth.enterDemo(); router.replace("/"); }}>
            Ver modo demonstração
          </button>
        )}
      </form>
    </main>
  );
}
