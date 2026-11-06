"""Métricas do dashboard."""
from datetime import timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth import require_admin
from database import Candidate, Instance, Message, get_db, now

TZ = ZoneInfo("America/Sao_Paulo")
from routes.candidates import candidate_out

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("")
async def dashboard(db: AsyncSession = Depends(get_db)):
    n = now().astimezone(TZ)
    day_start = n.replace(hour=0, minute=0, second=0, microsecond=0).astimezone(timezone.utc)
    week_start = day_start - timedelta(days=n.weekday())

    async def count(*where) -> int:
        return (await db.execute(select(func.count(Candidate.id)).where(*where))).scalar_one()

    interviews_today = await count(Candidate.status.in_(["aprovado", "agendado"]), Candidate.last_message_at >= day_start)
    in_screening = await count(Candidate.status == "em_triagem")
    scheduled_week = await count(Candidate.status == "agendado", Candidate.last_message_at >= week_start)
    connected = (await db.execute(select(func.count(Instance.id)).where(Instance.status == "online"))).scalar_one()
    total_inst = (await db.execute(select(func.count(Instance.id)))).scalar_one()

    # Volume de mensagens por hora (agrupado em Python para ser portátil entre SQLite/PostgreSQL).
    times = (await db.execute(select(Message.created_at).where(Message.created_at >= day_start))).scalars().all()
    buckets = {h: 0 for h in range(24)}
    for t in times:
        buckets[t.replace(tzinfo=t.tzinfo or timezone.utc).astimezone(TZ).hour] += 1
    hourly = [{"hour": f"{h:02d}h", "messages": v} for h, v in buckets.items()]

    modality = [
        {"name": label, "value": await count(Candidate.modality == key)}
        for key, label in (("estagio", "Estágio"), ("clt", "CLT"))
    ]

    recent_rows = (
        await db.execute(select(Candidate).options(selectinload(Candidate.instance)).order_by(Candidate.last_message_at.desc()).limit(10))
    ).scalars().all()

    return {
        "kpis": {
            "interviewsToday": interviews_today,
            "inScreening": in_screening,
            "scheduledThisWeek": scheduled_week,
            "connectedInstances": connected,
            "totalInstances": total_inst,
        },
        "hourly": hourly,
        "modality": modality,
        "recent": [candidate_out(c) for c in recent_rows],
    }
