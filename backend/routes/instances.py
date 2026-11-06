"""Gerenciamento de instâncias (números) de WhatsApp na UAZAP."""
import os
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

import settings_store as cfg
from auth import require_admin
from database import Instance, get_db
from services.whatsapp_service import UazapError, UazapService

router = APIRouter(dependencies=[Depends(require_admin)])


class InstanceOut(BaseModel):
    id: int
    name: str
    phone: str
    status: str
    agentEnabled: bool

    @classmethod
    def from_orm_obj(cls, i: Instance) -> "InstanceOut":
        return cls(id=i.id, name=i.name, phone=i.phone, status=i.status, agentEnabled=i.agent_enabled)


class InstanceCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class AgentToggle(BaseModel):
    enabled: bool


async def _svc(db: AsyncSession) -> UazapService:
    try:
        return UazapService(await cfg.get_setting(db, "uazap_base_url"), await cfg.get_setting(db, "uazap_admin_token"))
    except UazapError as e:
        raise HTTPException(400, str(e))


async def _get(db: AsyncSession, instance_id: int) -> Instance:
    inst = await db.get(Instance, instance_id)
    if not inst:
        raise HTTPException(404, "Instância não encontrada")
    return inst


async def _webhook_url(db: AsyncSession) -> str:
    public = os.getenv("PUBLIC_BACKEND_URL", "").rstrip("/")
    if not public:
        raise HTTPException(400, "Defina PUBLIC_BACKEND_URL no backend (URL pública HTTPS)")
    return f"{public}/api/webhook/whatsapp?secret={await cfg.get_setting(db, 'webhook_secret')}"


@router.get("", response_model=list[InstanceOut])
async def list_instances(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(Instance).order_by(Instance.id))).scalars().all()
    return [InstanceOut.from_orm_obj(i) for i in rows]


@router.post("", response_model=InstanceOut, status_code=201)
async def create_instance(body: InstanceCreate, db: AsyncSession = Depends(get_db)):
    """Cria a instância na UAZAP, guarda o token e registra o webhook."""
    svc = await _svc(db)
    slug = re.sub(r"[^a-z0-9]+", "-", body.name.lower()).strip("-") or "instancia"
    uazap_name = f"integra-{slug}"
    if (await db.execute(select(Instance).where(Instance.uazap_name == uazap_name))).scalar_one_or_none():
        raise HTTPException(409, "Já existe uma instância com esse nome")
    webhook_url = await _webhook_url(db)
    try:
        token = await svc.create_instance(uazap_name)
    except UazapError as e:
        raise HTTPException(502, str(e))

    # Persiste antes do webhook: se o webhook falhar, a instância (já criada na UAZAP) não fica órfã.
    inst = Instance(name=body.name, uazap_name=uazap_name, token=token, status="disconnected")
    db.add(inst)
    await db.commit()
    try:
        await svc.set_webhook(token, webhook_url)
    except UazapError as e:
        raise HTTPException(502, f"Instância criada, mas o webhook falhou ({e}). Use 'Reconfigurar webhook'.")
    return InstanceOut.from_orm_obj(inst)


@router.post("/{instance_id}/webhook", response_model=InstanceOut)
async def reconfigure_webhook(instance_id: int, db: AsyncSession = Depends(get_db)):
    inst = await _get(db, instance_id)
    try:
        await (await _svc(db)).set_webhook(inst.token, await _webhook_url(db))
    except UazapError as e:
        raise HTTPException(502, str(e))
    return InstanceOut.from_orm_obj(inst)


@router.post("/{instance_id}/qrcode")
async def request_qrcode(instance_id: int, db: AsyncSession = Depends(get_db)):
    """Solicita um novo QR Code (POST /instance/connect). Não chame em loop: cada chamada reinicia o pareamento."""
    inst = await _get(db, instance_id)
    svc = await _svc(db)
    try:
        qr = await svc.connect(inst.token)
        st = await svc.status(inst.token)
    except UazapError as e:
        raise HTTPException(502, str(e))
    inst.status = st["status"]
    if st["phone"]:
        inst.phone = st["phone"]
    await db.commit()
    return {"status": inst.status, "qrcode": None if inst.status == "online" else qr}


@router.get("/{instance_id}/status", response_model=InstanceOut)
async def connection_status(instance_id: int, db: AsyncSession = Depends(get_db)):
    """Consulta o status real na UAZAP e atualiza o banco."""
    inst = await _get(db, instance_id)
    try:
        st = await (await _svc(db)).status(inst.token)
    except UazapError as e:
        raise HTTPException(502, str(e))
    inst.status = st["status"]
    if st["phone"] and not inst.phone:
        inst.phone = st["phone"]
    await db.commit()
    return InstanceOut.from_orm_obj(inst)


@router.patch("/{instance_id}/agent", response_model=InstanceOut)
async def toggle_agent(instance_id: int, body: AgentToggle, db: AsyncSession = Depends(get_db)):
    inst = await _get(db, instance_id)
    inst.agent_enabled = body.enabled
    await db.commit()
    return InstanceOut.from_orm_obj(inst)
