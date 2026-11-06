"""Serviço assíncrono de conversa com a API da Anthropic."""
import json
import re
from dataclasses import dataclass, field

import anthropic

META_RE = re.compile(r"<meta>(.*?)</meta>", re.DOTALL)
MAX_HISTORY = 30


@dataclass
class ClaudeReply:
    text: str
    meta: dict = field(default_factory=dict)


def _build_messages(history: list[tuple[str, str]]) -> list[dict]:
    """Converte [(role, content)] em mensagens válidas: começa em 'user' e alterna papéis."""
    merged: list[dict] = []
    for role, content in history[-MAX_HISTORY:]:
        if merged and merged[-1]["role"] == role:
            merged[-1]["content"] += "\n" + content
        else:
            merged.append({"role": role, "content": content})
    while merged and merged[0]["role"] != "user":
        merged.pop(0)
    return merged


def _split_meta(raw: str) -> ClaudeReply:
    meta: dict = {}
    m = META_RE.search(raw)
    if m:
        try:
            meta = json.loads(m.group(1))
        except json.JSONDecodeError:
            meta = {}
    return ClaudeReply(text=META_RE.sub("", raw).strip(), meta=meta)


async def generate_reply(
    *, api_key: str, model: str, system_prompt: str, history: list[tuple[str, str]]
) -> ClaudeReply:
    if not api_key:
        raise RuntimeError("Anthropic API Key não configurada")
    messages = _build_messages(history)
    if not messages:
        raise ValueError("Histórico sem mensagem do usuário")

    client = anthropic.AsyncAnthropic(api_key=api_key, timeout=60.0, max_retries=2)
    response = await client.messages.create(
        model=model,
        max_tokens=1024,
        system=system_prompt,
        messages=messages,
    )
    raw = "".join(b.text for b in response.content if b.type == "text")
    return _split_meta(raw)
