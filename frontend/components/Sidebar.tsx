"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, MessageSquareText, Settings, Smartphone, X } from "lucide-react";
import Logo from "./Logo";
import { auth } from "@/lib/api";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/instancias", label: "Instâncias", icon: Smartphone },
  { href: "/candidatos", label: "Candidatos", icon: MessageSquareText },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-surface-line bg-gradient-to-b from-navy-deep to-surface-bg p-4 transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-8 flex items-center justify-between">
          <Logo />
          <button onClick={onClose} className="rounded p-1 hover:bg-white/10 lg:hidden" aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  active ? "bg-brand/15 font-medium text-brand" : "text-slate-300 hover:bg-white/5"
                }`}
              >
                <Icon size={18} /> {label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => { auth.clear(); router.replace("/login"); }}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-400 hover:bg-white/5"
        >
          <LogOut size={18} /> Sair
        </button>
      </aside>
    </>
  );
}
