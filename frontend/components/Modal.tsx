"use client";
import { useEffect } from "react";
import { X } from "lucide-react";

/** Modal centralizado, ou drawer lateral quando `side` é true. */
export default function Modal({ title, onClose, children, side = false }: { title: string; onClose: () => void; children: React.ReactNode; side?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={`fixed inset-0 z-50 flex bg-black/70 ${side ? "justify-end" : "items-center justify-center p-4"}`} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`card flex flex-col ${side ? "h-full w-full max-w-lg rounded-none" : "max-h-[90vh] w-full max-w-md"}`}
      >
        <div className="flex items-center justify-between border-b border-surface-line px-5 py-4">
          <h2 className="font-semibold text-white">{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="rounded p-1 hover:bg-white/10"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
