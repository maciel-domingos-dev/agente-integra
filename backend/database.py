"""Configuração do SQLAlchemy assíncrono e modelos."""
import os
from datetime import datetime, timezone
from typing import AsyncIterator

from dotenv import load_dotenv
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./integra.db")
engine = create_async_engine(DATABASE_URL, echo=False)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


def now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Instance(Base):
    __tablename__ = "instances"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))  # recrutador / setor
    uazap_name: Mapped[str] = mapped_column(String(120), unique=True)  # nome da instância na UAZAP
    token: Mapped[str] = mapped_column(String(200), default="", index=True)  # token da instância (segredo)
    phone: Mapped[str] = mapped_column(String(32), default="")
    status: Mapped[str] = mapped_column(String(20), default="disconnected")  # online|disconnected|qr_pending
    agent_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    candidates: Mapped[list["Candidate"]] = relationship(back_populates="instance")


class Candidate(Base):
    __tablename__ = "candidates"
    id: Mapped[int] = mapped_column(primary_key=True)
    instance_id: Mapped[int] = mapped_column(ForeignKey("instances.id"))
    phone: Mapped[str] = mapped_column(String(32), index=True)
    name: Mapped[str] = mapped_column(String(160), default="")
    modality: Mapped[str] = mapped_column(String(20), default="indefinido")  # estagio|clt|indefinido
    job: Mapped[str] = mapped_column(String(160), default="")
    status: Mapped[str] = mapped_column(String(30), default="em_triagem")  # em_triagem|aprovado|reprovado|agendado|transbordo
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    last_message_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    instance: Mapped[Instance] = relationship(back_populates="candidates")
    messages: Mapped[list["Message"]] = relationship(back_populates="candidate", order_by="Message.id")


class Message(Base):
    __tablename__ = "messages"
    id: Mapped[int] = mapped_column(primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"), index=True)
    role: Mapped[str] = mapped_column(String(10))  # user|assistant
    content: Mapped[str] = mapped_column(Text)
    wa_message_id: Mapped[str | None] = mapped_column(String(120), nullable=True, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, index=True)
    candidate: Mapped[Candidate] = relationship(back_populates="messages")


class Setting(Base):
    __tablename__ = "settings"
    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="")


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        yield session
