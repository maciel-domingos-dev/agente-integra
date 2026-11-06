import type { Modality, ScreeningStatus } from "@/types";

export const statusLabel: Record<ScreeningStatus, string> = {
  em_triagem: "Em triagem",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  agendado: "Agendado",
  transbordo: "Transbordo humano",
};

export const modalityLabel: Record<Modality, string> = { estagio: "Estágio", clt: "CLT", indefinido: "—" };

export const time = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (d.length >= 12) return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, -4)}-${d.slice(-4)}`;
  return raw;
}
