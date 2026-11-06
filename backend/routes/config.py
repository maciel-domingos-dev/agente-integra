"""Configurações do agente, Anthropic e UAZAP; e login do painel."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

import settings_store as cfg
from auth import check_password, create_token, require_admin
from database import get_db

router = APIRouter()

ALLOWED_MODELS = {"claude-sonnet-5-5", "claude-haiku-5-5"}


class LoginBody(BaseModel):
    password: str


@router.post("/auth/login")
async def login(body: LoginBody):
    if not check_password(body.password):
        raise HTTPException(401, "Senha incorreta")
    return {"token": create_token()}


class ConfigIn(BaseModel):
    """Campos secretos vazios = manter valor atual."""
    model: str | None = None
    systemPrompt: str | None = None
    anthropicApiKey: str | None = None
    uazapBaseUrl: str | None = None
    uazapAdminToken: str | None = None
    webhookSecret: str | None = None


def _public(values: dict[str, str]) -> dict:
    return {
        "model": values["model"],
        "systemPrompt": values["system_prompt"],
        "anthropicApiKeyMasked": cfg.mask(values["anthropic_api_key"]),
        "uazapBaseUrl": values["uazap_base_url"],
        "uazapAdminTokenMasked": cfg.mask(values["uazap_admin_token"]),
        "webhookSecretMasked": cfg.mask(values["webhook_secret"]),
    }


@router.get("/config", dependencies=[Depends(require_admin)])
async def get_config(db: AsyncSession = Depends(get_db)):
    return _public(await cfg.get_all(db))  # nunca devolve segredos completos


@router.put("/config", dependencies=[Depends(require_admin)])
async def put_config(body: ConfigIn, db: AsyncSession = Depends(get_db)):
    if body.model is not None and body.model not in ALLOWED_MODELS:
        raise HTTPException(422, f"Modelo inválido. Use um de: {sorted(ALLOWED_MODELS)}")
    if body.anthropicApiKey and not body.anthropicApiKey.startswith("sk-ant-"):
        raise HTTPException(422, "A API Key da Anthropic deve começar com sk-ant-")
    mapping = {
        "model": body.model,
        "system_prompt": body.systemPrompt,
        "anthropic_api_key": body.anthropicApiKey,
        "uazap_base_url": body.uazapBaseUrl,
        "uazap_admin_token": body.uazapAdminToken,
        "webhook_secret": body.webhookSecret,
    }
    for key, value in mapping.items():
        if value:  # vazio/None = não altera
            await cfg.set_setting(db, key, value.strip() if key != "system_prompt" else value)
    await db.commit()
    return _public(await cfg.get_all(db))
