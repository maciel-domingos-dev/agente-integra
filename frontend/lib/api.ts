import type {
  AgentConfig, AgentConfigUpdate, Candidate, ChatMessage, DashboardData, WhatsAppInstance,
} from "@/types";
import { mockCandidates, mockConfig, mockDashboard, mockInstances, mockMessages } from "./mock";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const DEMO_ALLOWED = process.env.NEXT_PUBLIC_DEMO_FALLBACK === "true";
const TOKEN_KEY = "integra_token";
const DEMO = "demo";

export const auth = {
  get: () => (typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
  isDemo: () => auth.get() === DEMO,
  enterDemo: () => localStorage.setItem(TOKEN_KEY, DEMO),
};

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.get()}`, ...init.headers },
  });
  if (res.status === 401) {
    auth.clear();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError(401, "Sessão expirada");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? `Erro ${res.status}`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export async function login(password: string): Promise<void> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new ApiError(res.status, res.status === 401 ? "Senha incorreta" : "Falha no login");
  auth.set((await res.json()).token);
}

// ---- Demo state (em memória) ----
const demoInstances = structuredClone(mockInstances);
let demoConfig = structuredClone(mockConfig);

export const api = {
  dashboard: async (): Promise<DashboardData> =>
    auth.isDemo() ? mockDashboard(demoInstances) : request("/api/dashboard"),

  instances: async (): Promise<WhatsAppInstance[]> =>
    auth.isDemo() ? structuredClone(demoInstances) : request("/api/instances"),

  createInstance: async (name: string): Promise<WhatsAppInstance> => {
    if (auth.isDemo()) {
      const i: WhatsAppInstance = { id: Date.now(), name, phone: "", status: "disconnected", agentEnabled: true };
      demoInstances.push(i);
      return i;
    }
    return request("/api/instances", { method: "POST", body: JSON.stringify({ name }) });
  },

  /** Pede um novo QR Code (reinicia o pareamento — não chamar em loop curto). */
  requestQrcode: async (id: number): Promise<{ status: string; qrcode: string | null }> => {
    if (auth.isDemo()) return { status: "qr_pending", qrcode: null };
    return request(`/api/instances/${id}/qrcode`, { method: "POST" });
  },

  /** Consulta o status real da conexão na UAZAP. */
  instanceStatus: async (id: number): Promise<WhatsAppInstance> => {
    if (auth.isDemo()) return { ...demoInstances.find((x) => x.id === id)! };
    return request(`/api/instances/${id}/status`);
  },

  reconfigureWebhook: async (id: number): Promise<void> => {
    if (!auth.isDemo()) await request(`/api/instances/${id}/webhook`, { method: "POST" });
  },

  toggleAgent: async (id: number, enabled: boolean): Promise<WhatsAppInstance> => {
    if (auth.isDemo()) {
      const i = demoInstances.find((x) => x.id === id)!;
      i.agentEnabled = enabled;
      return { ...i };
    }
    return request(`/api/instances/${id}/agent`, { method: "PATCH", body: JSON.stringify({ enabled }) });
  },

  candidates: async (f: { modality?: string; status?: string; instanceId?: string; q?: string }): Promise<Candidate[]> => {
    if (auth.isDemo()) {
      return mockCandidates.filter(
        (c) =>
          (!f.modality || c.modality === f.modality) &&
          (!f.status || c.status === f.status) &&
          (!f.instanceId || String(c.instanceId) === f.instanceId) &&
          (!f.q || (c.name + c.phone).toLowerCase().includes(f.q.toLowerCase())),
      );
    }
    const p = new URLSearchParams();
    if (f.modality) p.set("modality", f.modality);
    if (f.status) p.set("status", f.status);
    if (f.instanceId) p.set("instance_id", f.instanceId);
    if (f.q) p.set("q", f.q);
    return request(`/api/candidates?${p}`);
  },

  messages: async (id: number): Promise<ChatMessage[]> =>
    auth.isDemo() ? mockMessages[id] ?? [] : request(`/api/candidates/${id}/messages`),

  config: async (): Promise<AgentConfig> =>
    auth.isDemo() ? structuredClone(demoConfig) : request("/api/config"),

  saveConfig: async (body: AgentConfigUpdate): Promise<AgentConfig> => {
    if (auth.isDemo()) {
      demoConfig = { ...demoConfig, model: body.model ?? demoConfig.model, systemPrompt: body.systemPrompt ?? demoConfig.systemPrompt, uazapBaseUrl: body.uazapBaseUrl ?? demoConfig.uazapBaseUrl };
      return structuredClone(demoConfig);
    }
    return request("/api/config", { method: "PUT", body: JSON.stringify(body) });
  },
};
