"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, QrCode, RefreshCw } from "lucide-react";
import Modal from "./Modal";
import { api, auth } from "@/lib/api";
import type { WhatsAppInstance } from "@/types";

const STATUS_POLL_MS = 3000;
const QR_REFRESH_MS = 30_000; // QR do WhatsApp expira em ~30–60s; renovamos sem martelar o /connect

/** Pede o QR Code e consulta o status da conexão a cada 3s até ficar online. */
export default function QrModal({ instance, onClose, onConnected }: { instance: WhatsAppInstance; onClose: () => void; onConnected: () => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(true);
  const [nonce, setNonce] = useState(0); // incrementa para forçar novo QR (botão "Gerar novo")

  // Solicita QR agora e a cada QR_REFRESH_MS enquanto o modal estiver aberto e desconectado.
  useEffect(() => {
    if (connected) return;
    let active = true;
    const fetchQr = async () => {
      setLoadingQr(true);
      try {
        const r = await api.requestQrcode(instance.id);
        if (!active) return;
        if (r.status === "online") { setConnected(true); onConnected(); return; }
        setQr(r.qrcode);
        setError(null);
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoadingQr(false);
      }
    };
    fetchQr();
    const id = setInterval(fetchQr, QR_REFRESH_MS);
    return () => { active = false; clearInterval(id); };
  }, [instance.id, connected, nonce, onConnected]);

  // Verifica a conexão com frequência (barato: só GET /status).
  useEffect(() => {
    if (connected) return;
    let active = true;
    const id = setInterval(async () => {
      try {
        const s = await api.instanceStatus(instance.id);
        if (active && s.status === "online") { setConnected(true); onConnected(); }
      } catch { /* erros transitórios: tenta no próximo ciclo */ }
    }, STATUS_POLL_MS);
    return () => { active = false; clearInterval(id); };
  }, [instance.id, connected, onConnected]);

  return (
    <Modal title={`Conectar número · ${instance.name}`} onClose={onClose}>
      <div className="flex flex-col items-center gap-4 text-center">
        {connected ? (
          <>
            <CheckCircle2 size={64} className="text-brand" />
            <p className="text-white">WhatsApp conectado com sucesso!</p>
            <button className="btn-primary" onClick={onClose}>Concluir</button>
          </>
        ) : (
          <>
            <div className="flex h-64 w-64 items-center justify-center rounded-xl bg-white p-3">
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt="QR Code do WhatsApp" className="h-full w-full" />
              ) : auth.isDemo() ? (
                <QrCode size={120} className="text-navy" />
              ) : loadingQr ? (
                <Loader2 className="animate-spin text-navy" size={40} />
              ) : (
                <p className="text-sm text-slate-600">QR Code indisponível</p>
              )}
            </div>
            <ol className="space-y-1 text-left text-sm text-slate-300">
              <li>1. Abra o WhatsApp no celular do recrutador.</li>
              <li>2. Vá em <b>Aparelhos conectados</b> → <b>Conectar um aparelho</b>.</li>
              <li>3. Aponte a câmera para o QR Code acima.</li>
            </ol>
            <button className="btn-ghost" disabled={loadingQr} onClick={() => setNonce((n) => n + 1)}>
              <RefreshCw size={14} className={loadingQr ? "animate-spin" : ""} /> Gerar novo QR Code
            </button>
            <p className="text-xs text-slate-500">Aguardando conexão… esta janela fecha o pareamento sozinha quando o celular confirmar.</p>
            {auth.isDemo() && <p className="text-xs text-amber-300">Demonstração: o QR real é gerado pela UAZAP.</p>}
            {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          </>
        )}
      </div>
    </Modal>
  );
}
