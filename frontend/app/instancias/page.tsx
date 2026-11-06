"use client";
import { FormEvent, useCallback, useState } from "react";
import { Plus, QrCode, RefreshCw } from "lucide-react";
import Modal from "@/components/Modal";
import QrModal from "@/components/QrModal";
import { ConnectionBadge } from "@/components/StatusBadge";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import type { WhatsAppInstance } from "@/types";

export default function InstanciasPage() {
  const { data, error, loading, reload, setData } = useAsync(api.instances, [], 10_000);
  const [creating, setCreating] = useState(false);
  const [qrFor, setQrFor] = useState<WhatsAppInstance | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const onConnected = useCallback(() => { reload(); }, [reload]);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setFormError(null);
    try {
      const inst = await api.createInstance(String(f.get("name")));
      setCreating(false);
      setQrFor(inst);
      reload();
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  async function refresh(i: WhatsAppInstance) {
    setToggleError(null);
    try {
      const fresh = await api.instanceStatus(i.id);
      setData((d) => d && d.map((x) => (x.id === i.id ? fresh : x)));
    } catch (err) {
      setToggleError((err as Error).message);
    }
  }

  async function webhook(i: WhatsAppInstance) {
    setToggleError(null);
    try {
      await api.reconfigureWebhook(i.id);
    } catch (err) {
      setToggleError((err as Error).message);
    }
  }

  async function toggle(i: WhatsAppInstance) {
    setToggleError(null);
    setData((d) => d && d.map((x) => (x.id === i.id ? { ...x, agentEnabled: !i.agentEnabled } : x))); // otimista
    try {
      await api.toggleAgent(i.id, !i.agentEnabled);
    } catch (err) {
      setToggleError((err as Error).message);
      reload();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Instâncias & Números</h1>
          <p className="text-sm text-slate-400">Um número de WhatsApp para cada recrutador ou setor.</p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Conectar novo número</button>
      </div>

      {toggleError && <p role="alert" className="text-sm text-red-400">{toggleError}</p>}
      {loading && <p className="text-slate-400">Carregando…</p>}
      {error && <p role="alert" className="text-red-400">Erro: {error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data?.map((i) => (
          <article key={i.id} className="card space-y-4 p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold text-white">{i.name}</h2>
                <p className="text-sm text-slate-400">{i.phone || "Número será identificado após conectar"}</p>
              </div>
              <ConnectionBadge status={i.status} />
            </div>

            <label className="flex cursor-pointer items-center justify-between rounded-lg border border-surface-line px-3 py-2.5">
              <span>
                <span className="block text-sm text-slate-200">Agente de IA</span>
                <span className="block text-xs text-slate-500">{i.agentEnabled ? "Respondendo automaticamente" : "Desativado — transbordo humano"}</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={i.agentEnabled}
                aria-label={`Agente de IA de ${i.name}`}
                onClick={() => toggle(i)}
                className={`relative h-6 w-11 rounded-full transition ${i.agentEnabled ? "bg-brand" : "bg-slate-600"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${i.agentEnabled ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </label>

            <div className="flex flex-wrap gap-2">
              {i.status !== "online" && (
                <button className="btn-ghost flex-1" onClick={() => setQrFor(i)}><QrCode size={16} /> Ver QR Code</button>
              )}
              <button className="btn-ghost flex-1" onClick={() => refresh(i)}><RefreshCw size={16} /> Atualizar status</button>
            </div>
            <button className="text-xs text-slate-500 underline hover:text-slate-300" onClick={() => webhook(i)}>Reconfigurar webhook</button>
          </article>
        ))}
        {data?.length === 0 && <p className="text-slate-500">Nenhum número cadastrado.</p>}
      </div>

      {creating && (
        <Modal title="Conectar novo número" onClose={() => setCreating(false)}>
          <form onSubmit={onCreate} className="space-y-4">
            <div>
              <label htmlFor="name" className="label">Recrutador / setor</label>
              <input id="name" name="name" className="input" placeholder="Ex.: Ana Souza · Estágio" minLength={2} required />
            </div>
            {formError && <p role="alert" className="text-sm text-red-400">{formError}</p>}
            <button className="btn-primary w-full">Criar e gerar QR Code</button>
          </form>
        </Modal>
      )}

      {qrFor && <QrModal instance={qrFor} onClose={() => setQrFor(null)} onConnected={onConnected} />}
    </div>
  );
}
