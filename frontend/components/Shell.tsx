"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import { auth } from "@/lib/api";

/** Protege as rotas (exceto /login) e monta o layout com sidebar responsiva. */
export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const isLogin = pathname === "/login";

  useEffect(() => {
    if (!isLogin && !auth.get()) router.replace("/login");
    else setReady(true);
    setOpen(false);
  }, [pathname, isLogin, router]);

  if (isLogin) return <>{children}</>;
  if (!ready) return null;

  return (
    <div className="min-h-screen">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-surface-line bg-surface-bg/90 px-4 py-3 backdrop-blur lg:hidden">
          <button onClick={() => setOpen(true)} aria-label="Abrir menu" className="rounded-lg p-2 hover:bg-white/5">
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold text-white">Integra Consultoria</span>
        </header>
        {auth.isDemo() && (
          <div className="bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-300">
            Modo demonstração — dados fictícios, nada é enviado ao backend.
          </div>
        )}
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
