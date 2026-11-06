"""CRM de candidatos e transcrições."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth import require_admin
from database import Candidate, Message, get_db

router = APIRouter(dependencies=[Depends(require_admin)])


def iso_utc(d: datetime) -> str:
    """SQLite devolve datetimes sem tz; tudo é gravado em UTC."""
    return d.replace(tzinfo=d.tzinfo or timezone.utc).isoformat()


def candidate_out(c: Candidate) -> dict:
    return {
        "id": c.id,
        "name": c.name or "Sem nome",
        "phone": c.phone,
        "modality": c.modality,
        "job": c.job,
        "status": c.status,
        "instanceId": c.instance_id,
        "instanceName": c.instance.name,
        "lastMessageAt": iso_utc(c.last_message_at),
    }


@router.get("")
async def list_candidates(
    modality: str | None = None,
    status: str | None = None,
    instance_id: int | None = None,
    q: str | None = None,
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Candidate).options(selectinload(Candidate.instance)).order_by(Candidate.last_message_at.desc()).limit(limit)
    if modality:
        stmt = stmt.where(Candidate.modality == modality)
    if status:
        stmt = stmt.where(Candidate.status == status)
    if instance_id:
        stmt = stmt.where(Candidate.instance_id == instance_id)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(Candidate.name.ilike(like) | Candidate.phone.ilike(like))
    return [candidate_out(c) for c in (await db.execute(stmt)).scalars().all()]


@router.get("/{candidate_id}/messages")
async def get_messages(candidate_id: int, db: AsyncSession = Depends(get_db)):
    if not await db.get(Candidate, candidate_id):
        raise HTTPException(404, "Candidato não encontrado")
    rows = (await db.execute(select(Message).where(Message.candidate_id == candidate_id).order_by(Message.id))).scalars().all()
    return [{"id": m.id, "role": m.role, "content": m.content, "createdAt": iso_utc(m.created_at)} for m in rows]
