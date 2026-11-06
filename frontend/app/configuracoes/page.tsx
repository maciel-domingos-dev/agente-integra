"use client";
import { FormEvent, useState } from "react";
import { Save } from "lucide-react";
import Logo from "@/components/Logo";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import type { AgentConfigUpdate, ClaudeModel } from "@/types";

const MODELS: { id: ClaudeModel; title: string; desc: string }[] = [
  { id: "claude-sonnet-5-5", title: "Claude Sonnet 5.5", desc: "Triagem detalhada — melhor raciocínio e aderência ao roteiro." },
  { id: "claude-haiku-5-5", title: "Claude Haiku 5.5", desc: "Respostas ultra-rápidas e custo menor." },
];

export default function ConfiguracoesPage() {
  const { data, error, loading, setData } = useAsync(api.config, []);
  const [model, setModel] = useState<ClaudeModel | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (loading) return <p className="text-slate-400">Carregando…</p>;
  if (error || !data) return <p role="alert" className="text-red-400">Erro: {error}</p>;
  const selectedModel = model ?? data.model;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget; // currentTarget vira null após o primeiro await
    const f = new FormData(form);
    const get = (k: string) => String(f.get(k) ?? "");
    // Campos secretos em branco = manter o valor atual no backend.
    const body: AgentConfigUpdate = {
      model: selectedModel,
      systemPrompt: get("systemPrompt"),
      anthropicApiKey: get("anthropicApiKey"),
      uazapBaseUrl: get("uazapBaseUrl"),
      uazapAdminToken: get("uazapAdminToken"),
      webhookSecret: get("webhookSecret"),
    };
    setSaving(true);
    setMsg(null);
    try {
      setData(await api.saveConfig(body));
      form.reset();
      setMsg({ ok: true, text: "Configurações salvas." });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Configurações do Agente</h1>
          <p className="text-sm text-slate-400">Modelo, credenciais e diretrizes de triagem.</p>
        </div>
        <div className="hidden sm:block"><Logo size={48} /></div>
      </div>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-white">Modelo da Anthropic</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {MODELS.map((m) => (
            <label key={m.id} className={`cursor-pointer rounded-xl border p-4 transition ${selectedModel === m.id ? "border-brand bg-brand/10" : "border-surface-line hover:bg-white/5"}`}>
              <input type="radio" name="model" className="sr-only" checked={selectedModel === m.id} onChange={() => setModel(m.id)} />
              <p className="font-medium text-white">{m.title}</p>
              <p className="text-xs text-slate-400">{m.desc}</p>
              <p className="mt-1 font-mono text-[11px] text-slate-500">{m.id}</p>
            </label>
          ))}
        </div>
        <div>
          <label htmlFor="anthropicApiKey" className="label">Anthropic API Key</label>
          <input id="anthropicApiKey" name="anthropicApiKey" type="password" autoComplete="off" className="input font-mono" placeholder={data.anthropicApiKeyMasked ? `Atual: ${data.anthropicApiKeyMasked} (deixe em branco para manter)` : "sk-ant-..."} />
        </div>
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-white">UAZAP</h2>
        <div>
          <label htmlFor="uazapBaseUrl" className="label">URL base</label>
          <input id="uazapBaseUrl" name="uazapBaseUrl" type="url" className="input" defaultValue={data.uazapBaseUrl} placeholder="https://seu-subdominio.uazapi.com" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="uazapAdminToken" className="label">Admin Token</label>
            <input id="uazapAdminToken" name="uazapAdminToken" type="password" autoComplete="off" className="input font-mono" placeholder={data.uazapAdminTokenMasked ? `Atual: ${data.uazapAdminTokenMasked}` : ""} />
          </div>
          <div>
            <label htmlFor="webhookSecret" className="label">Webhook Secret</label>
            <input id="webhookSecret" name="webhookSecret" type="password" autoComplete="off" className="input font-mono" placeholder={data.webhookSecretMasked ? `Atual: ${data.webhookSecretMasked}` : ""} />
          </div>
        </div>
        <p className="text-xs text-slate-500">O webhook é registrado automaticamente em cada instância nova, apontando para <span className="font-mono">{"{PUBLIC_BACKEND_URL}"}/api/webhook/whatsapp?secret=…</span> (o Webhook Secret vai na URL, pois a UAZAP não envia headers customizados).</p>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold text-white">System Prompt</h2>
        <p className="text-xs text-slate-500">
          Mantenha o bloco <span className="font-mono">&lt;meta&gt;…&lt;/meta&gt;</span> nas instruções: é ele que permite ao painel registrar nome, vaga, modalidade e status da triagem.
        </p>
        <textarea name="systemPrompt" rows={18} className="input font-mono text-xs leading-relaxed" defaultValue={data.systemPrompt} required />
      </section>

      <div className="flex items-center gap-4">
        <button className="btn-primary" disabled={saving}><Save size={16} /> {saving ? "Salvando…" : "Salvar configurações"}</button>
        {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-brand" : "text-red-400"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}
