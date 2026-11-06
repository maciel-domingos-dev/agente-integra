export type Modality = "estagio" | "clt" | "indefinido";
export type ScreeningStatus = "em_triagem" | "aprovado" | "reprovado" | "agendado" | "transbordo";
export type ConnectionStatus = "online" | "disconnected" | "qr_pending";

export interface Candidate {
  id: number;
  name: string;
  phone: string;
  modality: Modality;
  job: string;
  status: ScreeningStatus;
  instanceId: number;
  instanceName: string;
  lastMessageAt: string; // ISO 8601
}

export interface WhatsAppInstance {
  id: number;
  name: string; // recrutador / setor
  phone: string;
  status: ConnectionStatus;
  agentEnabled: boolean;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export type ClaudeModel = "claude-sonnet-5-5" | "claude-haiku-5-5";

/** Segredos nunca voltam completos do backend: apenas versões mascaradas. */
export interface AgentConfig {
  model: ClaudeModel;
  systemPrompt: string;
  anthropicApiKeyMasked: string;
  uazapBaseUrl: string;
  uazapAdminTokenMasked: string;
  webhookSecretMasked: string;
}

export interface AgentConfigUpdate {
  model?: ClaudeModel;
  systemPrompt?: string;
  anthropicApiKey?: string;
  uazapBaseUrl?: string;
  uazapAdminToken?: string;
  webhookSecret?: string;
}

export interface DashboardData {
  kpis: {
    interviewsToday: number;
    inScreening: number;
    scheduledThisWeek: number;
    connectedInstances: number;
    totalInstances: number;
  };
  hourly: { hour: string; messages: number }[];
  modality: { name: string; value: number }[];
  recent: Candidate[];
}
