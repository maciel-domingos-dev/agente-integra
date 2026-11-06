"""Webhook de entrada da UAZAP.

A UAZAP envia o envelope {EventType, owner, token, instanceName, message, ...}. Ela não permite headers
customizados, então a URL registrada na instância carrega `?secret=<WEBHOOK_SECRET>`.
"""
import asyncio
import hmac
import logging
from collections import defaultdict

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

import settings_store as cfg
from database import Candidate, Instance, Message, SessionLocal, now
from services import claude_service
from services.whatsapp_service import UazapService

router = APIRouter()
log = logging.getLogger("webhook")

# Um lock por conversa evita respostas fora de ordem se o candidato mandar várias mensagens seguidas.
_locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)

VALID_STATUS = {"em_triagem", "aprovado", "reprovado", "agendado", "transbordo"}
VALID_MODALITY = {"estagio", "clt", "indefinido"}


@router.post("/whatsapp")
async def whatsapp_webhook(request: Request, background: BackgroundTasks, secret: str = Query(default="")):
    async with SessionLocal() as db:
        expected = await cfg.get_setting(db, "webhook_secret")
    if not expected or not hmac.compare_digest(secret.encode(), expected.encode()):
        raise HTTPException(status_code=401, detail="Webhook secret inválido")

    payload = await request.json()
    event = str(payload.get("EventType", "")).lower()
    token = payload.get("token", "")
    if not token:
        return {"ok": True}

    # Responde 200 rápido; o processamento (Claude + envio) segue em background.
    if event == "messages":
        background.add_task(_handle_message, token, payload)
    elif event == "connection":
        background.add_task(_refresh_status, token)
    return {"ok": True}


async def _instance_by_token(db, token: str) -> Instance | None:
    # O token do payload identifica a sessão e deve existir no nosso banco (não confiamos em owner/instanceName).
    return (await db.execute(select(Instance).where(Instance.token == token))).scalar_one_or_none()


async def _refresh_status(token: str) -> None:
    try:
        async with SessionLocal() as db:
            inst = await _instance_by_token(db, token)
            if not inst:
                return
            svc = UazapService(await cfg.get_setting(db, "uazap_base_url"))
            st = await svc.status(token)
            inst.status = st["status"]
            if st["phone"] and not inst.phone:
                inst.phone = st["phone"]
            await db.commit()
    except Exception:
        log.exception("Falha ao atualizar status da instância")


async def _handle_message(token: str, payload: dict) -> None:
    msg = payload.get("message") or {}
    chatid: str = msg.get("chatid", "")
    # Ignora grupos, mensagens do próprio número e as enviadas pela API (nossas respostas).
    if msg.get("isGroup") or msg.get("fromMe") or msg.get("wasSentByApi") or not chatid.endswith("@s.whatsapp.net"):
        return
    text = (msg.get("text") or "").strip()
    if not text:  # mídia sem legenda etc.
        return
    phone = chatid.split("@")[0]

    async with _locks[f"{token}:{phone}"]:
        try:
            await _process(token, phone, msg.get("senderName", ""), text, msg.get("messageid"), payload.get("owner", ""))
        except Exception:
            log.exception("Falha ao processar mensagem de %s", phone)


async def _process(token: str, phone: str, push_name: str, text: str, wa_id: str | None, owner: str) -> None:
    async with SessionLocal() as db:
        inst = await _instance_by_token(db, token)
        if not inst:
            log.warning("Webhook com token desconhecido")
            return
        if owner and not inst.phone:
            inst.phone = owner

        cand = (
            await db.execute(select(Candidate).where(Candidate.instance_id == inst.id, Candidate.phone == phone))
        ).scalar_one_or_none()
        if not cand:
            cand = Candidate(instance_id=inst.id, phone=phone, name=push_name)
            db.add(cand)
            await db.flush()

        # 1) Sempre registra a mensagem recebida.
        db.add(Message(candidate_id=cand.id, role="user", content=text, wa_message_id=wa_id))
        cand.last_message_at = now()
        try:
            await db.commit()
        except IntegrityError:  # reenvio duplicado do webhook
            await db.rollback()
            return

        # 2) Transbordo humano: agente desligado no número ou conversa já assumida por uma pessoa.
        if not inst.agent_enabled or cand.status == "transbordo":
            return

        # 3) Claude: histórico completo + System Prompt.
        rows = (
            await db.execute(select(Message.role, Message.content).where(Message.candidate_id == cand.id).order_by(Message.id))
        ).all()
        reply = await claude_service.generate_reply(
            api_key=await cfg.get_setting(db, "anthropic_api_key"),
            model=await cfg.get_setting(db, "model"),
            system_prompt=await cfg.get_setting(db, "system_prompt"),
            history=[(r, c) for r, c in rows],
        )
        if not reply.text:
            return

        # 4) Envia a resposta limpa (sem <meta>) pela UAZAP; só registra no histórico se o envio funcionou.
        await UazapService(await cfg.get_setting(db, "uazap_base_url")).send_text(token, phone, reply.text)
        db.add(Message(candidate_id=cand.id, role="assistant", content=reply.text))

        # 5) Atualiza o CRM com os metadados extraídos do <meta>.
        meta = reply.meta
        if meta.get("name"):
            cand.name = str(meta["name"])[:160]
        if meta.get("job"):
            cand.job = str(meta["job"])[:160]
        if meta.get("modality") in VALID_MODALITY:
            cand.modality = meta["modality"]
        if meta.get("status") in VALID_STATUS:
            cand.status = meta["status"]
        cand.last_message_at = now()
        await db.commit()
