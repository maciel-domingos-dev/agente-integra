// Dados fictícios usados apenas no "modo demonstração" (sem backend).
import type { AgentConfig, Candidate, ChatMessage, DashboardData, WhatsAppInstance } from "@/types";

const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

export const mockInstances: WhatsAppInstance[] = [
  { id: 1, name: "Ana Souza · Estágio", phone: "+55 11 98888-1001", status: "online", agentEnabled: true },
  { id: 2, name: "Carlos Lima · CLT", phone: "+55 11 97777-2002", status: "online", agentEnabled: true },
  { id: 3, name: "Setor Triagem Geral", phone: "+55 21 96666-3003", status: "disconnected", agentEnabled: false },
];

export const mockCandidates: Candidate[] = [
  { id: 1, name: "João Pereira", phone: "5511999990001", modality: "estagio", job: "Estágio Administrativo", status: "em_triagem", instanceId: 1, instanceName: "Ana Souza · Estágio", lastMessageAt: ago(3) },
  { id: 2, name: "Mariana Costa", phone: "5511999990002", modality: "clt", job: "Analista de RH", status: "agendado", instanceId: 2, instanceName: "Carlos Lima · CLT", lastMessageAt: ago(18) },
  { id: 3, name: "Lucas Ferreira", phone: "5511999990003", modality: "estagio", job: "Estágio em Marketing", status: "aprovado", instanceId: 1, instanceName: "Ana Souza · Estágio", lastMessageAt: ago(42) },
  { id: 4, name: "Beatriz Alves", phone: "5521999990004", modality: "clt", job: "Assistente Comercial", status: "transbordo", instanceId: 2, instanceName: "Carlos Lima · CLT", lastMessageAt: ago(75) },
  { id: 5, name: "Rafael Gomes", phone: "5511999990005", modality: "clt", job: "Auxiliar Administrativo", status: "reprovado", instanceId: 2, instanceName: "Carlos Lima · CLT", lastMessageAt: ago(130) },
];

export const mockMessages: Record<number, ChatMessage[]> = {
  1: [
    { id: 1, role: "user", content: "Oi, vi a vaga de estágio de vocês", createdAt: ago(9) },
    { id: 2, role: "assistant", content: "Olá! Eu sou a assistente virtual da Integra Consultoria 😊 Para começar, qual é o seu nome?", createdAt: ago(9) },
    { id: 3, role: "user", content: "João Pereira", createdAt: ago(7) },
    { id: 4, role: "assistant", content: "Prazer, João! Você busca vaga de Estágio ou CLT?", createdAt: ago(7) },
    { id: 5, role: "user", content: "Estágio, cursando Administração", createdAt: ago(3) },
  ],
};

export const mockConfig: AgentConfig = {
  model: "claude-sonnet-5-5",
  systemPrompt: "Você é a assistente virtual de recrutamento da Integra Consultoria…",
  anthropicApiKeyMasked: "sk-ant-…demo",
  uazapBaseUrl: "https://demo.uazapi.com",
  uazapAdminTokenMasked: "••••••••",
  webhookSecretMasked: "••••••••",
};

export function mockDashboard(instances: WhatsAppInstance[]): DashboardData {
  const peaks = [0, 0, 0, 0, 0, 1, 3, 8, 21, 34, 29, 18, 12, 19, 27, 31, 22, 14, 9, 6, 3, 2, 1, 0];
  return {
    kpis: {
      interviewsToday: 12,
      inScreening: 27,
      scheduledThisWeek: 41,
      connectedInstances: instances.filter((i) => i.status === "online").length,
      totalInstances: instances.length,
    },
    hourly: peaks.map((messages, h) => ({ hour: `${String(h).padStart(2, "0")}h`, messages })),
    modality: [
      { name: "Estágio", value: 64 },
      { name: "CLT", value: 38 },
    ],
    recent: mockCandidates,
  };
}
