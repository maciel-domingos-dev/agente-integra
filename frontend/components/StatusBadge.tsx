import type { ConnectionStatus, ScreeningStatus } from "@/types";
import { statusLabel } from "@/lib/format";

const screening: Record<ScreeningStatus, string> = {
  em_triagem: "bg-cyan-brand/15 text-sky-300",
  aprovado: "bg-brand/15 text-brand",
  agendado: "bg-emerald-500/15 text-emerald-300",
  reprovado: "bg-red-500/15 text-red-300",
  transbordo: "bg-amber-500/15 text-amber-300",
};

export function ScreeningBadge({ status }: { status: ScreeningStatus }) {
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${screening[status]}`}>{statusLabel[status]}</span>;
}

const conn: Record<ConnectionStatus, { label: string; cls: string }> = {
  online: { label: "Online", cls: "bg-brand/15 text-brand" },
  disconnected: { label: "Desconectado", cls: "bg-red-500/15 text-red-300" },
  qr_pending: { label: "Gerando QR Code", cls: "bg-amber-500/15 text-amber-300" },
};

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  const { label, cls } = conn[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" /> {label}
    </span>
  );
}
