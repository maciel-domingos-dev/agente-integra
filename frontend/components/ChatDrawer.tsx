"use client";
import { Bot, User } from "lucide-react";
import Modal from "./Modal";
import { ScreeningBadge } from "./StatusBadge";
import { api } from "@/lib/api";
import { dateTime, formatPhone, modalityLabel } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import type { Candidate } from "@/types";

export default function ChatDrawer({ candidate, onClose }: { candidate: Candidate; onClose: () => void }) {
  const { data, error, loading } = useAsync(() => api.messages(candidate.id), [candidate.id], 10_000);

  return (
    <Modal side title={candidate.name} onClose={onClose}>
      <div className="mb-4 space-y-1 text-sm text-slate-400">
        <p>{formatPhone(candidate.phone)} · {modalityLabel[candidate.modality]} · {candidate.job || "Vaga não informada"}</p>
        <p>Atendido por <span className="text-slate-200">{candidate.instanceName}</span></p>
        <ScreeningBadge status={candidate.status} />
      </div>

      {loading && <p className="text-slate-400">Carregando conversa…</p>}
      {error && <p role="alert" className="text-red-400">Erro: {error}</p>}
      {data?.length === 0 && <p className="text-slate-500">Sem mensagens.</p>}

      <ul className="space-y-3">
        {data?.map((m) => {
          const bot = m.role === "assistant";
          return (
            <li key={m.id} className={`flex gap-2 ${bot ? "" : "flex-row-reverse"}`}>
              <span className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${bot ? "bg-brand/20 text-brand" : "bg-cyan-brand/20 text-sky-300"}`}>
                {bot ? <Bot size={14} /> : <User size={14} />}
              </span>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${bot ? "rounded-tl-sm bg-brand/10 text-slate-100" : "rounded-tr-sm bg-navy/60 text-slate-100"}`}>
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p className="mt-1 text-[10px] text-slate-400">{bot ? "Claude" : "Candidato"} · {dateTime(m.createdAt)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
