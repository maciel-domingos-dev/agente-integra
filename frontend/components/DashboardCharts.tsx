"use client";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import type { DashboardData } from "@/types";

const PIE_COLORS = ["#58B32B", "#0072CE"];
const tooltipStyle = { background: "#111827", border: "1px solid #1F2A44", borderRadius: 8, color: "#e2e8f0" };

export function HourlyChart({ data }: { data: DashboardData["hourly"] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: -20 }}>
        <CartesianGrid stroke="#1F2A44" vertical={false} />
        <XAxis dataKey="hour" stroke="#64748b" fontSize={11} interval={2} />
        <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,.04)" }} formatter={(v) => [v, "Mensagens"]} />
        <Bar dataKey="messages" fill="#58B32B" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ModalityChart({ data }: { data: DashboardData["modality"] }) {
  if (data.every((d) => d.value === 0)) {
    return <p className="flex h-[260px] items-center justify-center text-sm text-slate-500">Sem candidatos ainda.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3} stroke="none">
          {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
