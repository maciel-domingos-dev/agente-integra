"""Configurações editáveis pelo painel (persistidas no banco, com fallback para o .env)."""
import os

from sqlalchemy.ext.asyncio import AsyncSession

from database import Setting

DEFAULT_SYSTEM_PROMPT = """Você é a assistente virtual de recrutamento da Integra Consultoria, atendendo candidatos pelo WhatsApp.

OBJETIVO
Fazer a triagem inicial de candidatos para vagas de Estágio e CLT e encaminhar os aprovados para entrevista com a equipe.

REGRAS DE CONVERSA
- Escreva em português do Brasil, tom cordial, profissional e objetivo. Mensagens curtas (máx. 3 parágrafos), adequadas ao WhatsApp.
- Faça UMA pergunta por vez.
- Nunca invente vagas, salários, benefícios ou prazos. Se não souber, diga que um recrutador retornará.
- Não peça documentos sensíveis (CPF, RG, dados bancários) nesta etapa.

ROTEIRO DE TRIAGEM
1. Cumprimente, apresente-se e pergunte o nome.
2. Pergunte a modalidade de interesse: Estágio ou CLT.
3. Estágio: instituição, curso, semestre atual, disponibilidade de horário.
   CLT: área de atuação, experiência, pretensão e disponibilidade de início.
4. Pergunte a vaga pretendida e a cidade/bairro.
5. Ofereça agendamento de entrevista e confirme dia e horário.

TRANSBORDO HUMANO
Se o candidato pedir para falar com uma pessoa, reclamar, ou o assunto fugir de recrutamento, diga que um recrutador assumirá e use status "transbordo".

METADADOS (OBRIGATÓRIO)
Ao final de TODA resposta, adicione em uma linha separada um bloco, que será removido antes do envio ao candidato:
<meta>{"name":"","modality":"estagio|clt|indefinido","job":"","status":"em_triagem|aprovado|reprovado|agendado|transbordo"}</meta>
Preencha apenas o que já foi informado; mantenha "" quando desconhecido.
"""

DEFAULTS = {
    "anthropic_api_key": lambda: os.getenv("ANTHROPIC_API_KEY", ""),
    "model": lambda: os.getenv("ANTHROPIC_MODEL", "claude-sonnet-5-5"),
    "system_prompt": lambda: DEFAULT_SYSTEM_PROMPT,
    "uazap_base_url": lambda: os.getenv("UAZAP_BASE_URL", ""),
    "uazap_admin_token": lambda: os.getenv("UAZAP_ADMIN_TOKEN", ""),
    "webhook_secret": lambda: os.getenv("WEBHOOK_SECRET", ""),
}
SECRET_KEYS = {"anthropic_api_key", "uazap_admin_token", "webhook_secret"}


async def get_setting(db: AsyncSession, key: str) -> str:
    row = await db.get(Setting, key)
    if row and row.value:
        return row.value
    return DEFAULTS[key]()


async def get_all(db: AsyncSession) -> dict[str, str]:
    return {k: await get_setting(db, k) for k in DEFAULTS}


async def set_setting(db: AsyncSession, key: str, value: str) -> None:
    row = await db.get(Setting, key)
    if row:
        row.value = value
    else:
        db.add(Setting(key=key, value=value))


def mask(value: str) -> str:
    if not value:
        return ""
    return value[:7] + "…" + value[-4:] if len(value) > 14 else "••••••••"
