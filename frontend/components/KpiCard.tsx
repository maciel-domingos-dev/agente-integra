import type { LucideIcon } from "lucide-react";

export default function KpiCard({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon: LucideIcon; hint?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        <span className="rounded-lg bg-brand/15 p-2 text-brand"><Icon size={18} /></span>
      </div>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
