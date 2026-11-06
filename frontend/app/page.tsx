"use client";
import { CalendarCheck, Smartphone, UserCheck, Users } from "lucide-react";
import KpiCard from "@/components/KpiCard";
import { HourlyChart, ModalityChart } from "@/components/DashboardCharts";
import { ScreeningBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { formatPhone, modalityLabel, time } from "@/lib/format";
import { useAsync } from "@/lib/useAsync";

export default function DashboardPage() {
  // Atualiza a cada 15s para a tabela funcionar como "tempo real".
  const { data, error, loading } = useAsync(api.dashboard, [], 15_000);

  if (loading) return <p className="text-slate-400">Carregando…</p>;
  if (error || !data) return <p role="alert" className="text-red-400">Erro ao carregar o dashboard: {error}</p>;
  const { kpis } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-slate-400">Visão operacional do atendimento automatizado de candidatos.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Entrevistas Realizadas Hoje" value={kpis.interviewsToday} icon={UserCheck} />
        <KpiCard label="Candidatos em Triagem" value={kpis.inScreening} icon={Users} />
        <KpiCard label="Agendamentos na Semana" value={kpis.scheduledThisWeek} icon={CalendarCheck} />
        <KpiCard label="Instâncias Conectadas" value={`${kpis.connectedInstances}/${kpis.totalInstances}`} icon={Smartphone} />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-white">Volume de mensagens por horário (hoje)</h2>
          <HourlyChart data={data.hourly} />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 font-semibold text-white">Estágio vs. CLT</h2>
          <ModalityChart data={data.modality} />
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-surface-line px-5 py-4">
          <h2 className="font-semibold text-white">Últimos atendimentos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-400">
              <tr>
                {["Candidato", "Vaga pretendida", "Triagem", "Número receptor", "Horário"].map((h) => (
                  <th key={h} className="px-5 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-line">
              {data.recent.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-500">Nenhum atendimento ainda.</td></tr>
              )}
              {data.recent.map((c) => (
                <tr key={c.id} className="hover:bg-white/[.02]">
                  <td className="px-5 py-3">
                    <p className="font-medium text-white">{c.name}</p>
                    <p className="text-xs text-slate-500">{formatPhone(c.phone)}</p>
                  </td>
                  <td className="px-5 py-3">{c.job || "—"} <span className="text-xs text-slate-500">· {modalityLabel[c.modality]}</span></td>
                  <td className="px-5 py-3"><ScreeningBadge status={c.status} /></td>
                  <td className="px-5 py-3 text-slate-300">{c.instanceName}</td>
                  <td className="px-5 py-3 text-slate-400">{time(c.lastMessageAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
