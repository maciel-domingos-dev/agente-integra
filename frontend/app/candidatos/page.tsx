"use client";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import ChatDrawer from "@/components/ChatDrawer";
import { ScreeningBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { dateTime, formatPhone, modalityLabel, statusLabel } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";
import type { Candidate } from "@/types";

export default function CandidatosPage() {
  const [filters, setFilters] = useState({ modality: "", status: "", instanceId: "", q: "" });
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selected, setSelected] = useState<Candidate | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  const instances = useAsync(api.instances, []);
  const { data, error, loading } = useAsync(
    () => api.candidates({ ...filters, q: debouncedQ }),
    [filters.modality, filters.status, filters.instanceId, debouncedQ],
  );

  const set = (k: keyof typeof filters) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Candidatos</h1>
        <p className="text-sm text-slate-400">CRM de candidatos e transcrições das conversas com o Claude.</p>
      </div>

      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute left-3 top-2.5 text-slate-500" />
          <input aria-label="Buscar" className="input pl-9" placeholder="Nome ou telefone" value={filters.q} onChange={set("q")} />
        </div>
        <select aria-label="Modalidade" className="input" value={filters.modality} onChange={set("modality")}>
          <option value="">Todas as vagas</option>
          <option value="estagio">Estágio</option>
          <option value="clt">CLT</option>
        </select>
        <select aria-label="Recrutador" className="input" value={filters.instanceId} onChange={set("instanceId")}>
          <option value="">Todos os números</option>
          {instances.data?.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <select aria-label="Status da triagem" className="input" value={filters.status} onChange={set("status")}>
          <option value="">Todos os status</option>
          {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading && <p className="text-slate-400">Carregando…</p>}
      {error && <p role="alert" className="text-red-400">Erro: {error}</p>}

      {/* Tabela em telas maiores */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-400">
            <tr>{["Candidato", "Vaga", "Status", "Recrutador", "Última msg"].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-surface-line">
            {data?.map((c) => (
              <tr key={c.id} onClick={() => setSelected(c)} className="cursor-pointer hover:bg-white/[.03]">
                <td className="px-5 py-3">
                  <button className="text-left" onClick={() => setSelected(c)}>
                    <span className="block font-medium text-white">{c.name}</span>
                    <span className="text-xs text-slate-500">{formatPhone(c.phone)}</span>
                  </button>
                </td>
                <td className="px-5 py-3">{c.job || "—"} <span className="text-xs text-slate-500">· {modalityLabel[c.modality]}</span></td>
                <td className="px-5 py-3"><ScreeningBadge status={c.status} /></td>
                <td className="px-5 py-3 text-slate-300">{c.instanceName}</td>
                <td className="px-5 py-3 text-slate-400">{dateTime(c.lastMessageAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards no mobile */}
      <div className="space-y-3 md:hidden">
        {data?.map((c) => (
          <button key={c.id} onClick={() => setSelected(c)} className="card block w-full space-y-2 p-4 text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-white">{c.name}</span>
              <ScreeningBadge status={c.status} />
            </div>
            <p className="text-sm text-slate-400">{c.job || "—"} · {modalityLabel[c.modality]}</p>
            <p className="text-xs text-slate-500">{c.instanceName} · {dateTime(c.lastMessageAt)}</p>
          </button>
        ))}
      </div>

      {data?.length === 0 && !loading && <p className="text-center text-slate-500">Nenhum candidato encontrado com esses filtros.</p>}
      {selected && <ChatDrawer candidate={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
