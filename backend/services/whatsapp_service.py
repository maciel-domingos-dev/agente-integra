"""Cliente assíncrono da UAZAP (uazapiGO).

Autenticação (conforme docs.uazapi.com):
  - operações administrativas (criar instância): header `admintoken`
  - operações da instância (conectar, status, enviar): header `token` da instância
"""
from typing import Any

import httpx


class UazapError(Exception):
    pass


def _find_str(data: Any, keys: tuple[str, ...]) -> str | None:
    """Busca recursiva do primeiro valor string para uma das chaves (a docs não fixa o formato da resposta)."""
    if isinstance(data, dict):
        for k in keys:
            if isinstance(data.get(k), str) and data[k]:
                return data[k]
        for v in data.values():
            found = _find_str(v, keys)
            if found:
                return found
    elif isinstance(data, list):
        for v in data:
            found = _find_str(v, keys)
            if found:
                return found
    return None


def map_status(data: dict) -> str:
    """UAZAP: disconnected | connecting | connected | hibernated  ->  online | qr_pending | disconnected."""
    raw = _find_str(data, ("status", "state"))
    return {"connected": "online", "connecting": "qr_pending"}.get((raw or "").lower(), "disconnected")


class UazapService:
    def __init__(self, base_url: str, admin_token: str = ""):
        if not base_url:
            raise UazapError("UAZAP: URL base não configurada")
        self.base_url = base_url.rstrip("/")
        self.admin_token = admin_token

    async def _request(self, method: str, path: str, headers: dict, json: dict | None = None) -> dict:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                r = await client.request(method, f"{self.base_url}{path}", headers=headers, json=json)
        except httpx.HTTPError as e:
            raise UazapError(f"Falha de rede ao falar com a UAZAP: {e}") from e
        if r.status_code >= 400:
            raise UazapError(f"UAZAP {method} {path} -> {r.status_code}: {r.text[:200]}")
        try:
            return r.json() if r.content else {}
        except ValueError:
            return {}

    # ---- Administração ----
    async def create_instance(self, name: str) -> str:
        """Cria a instância e devolve o token dela."""
        if not self.admin_token:
            raise UazapError("UAZAP: admin token não configurado")
        data = await self._request("POST", "/instance/create", {"admintoken": self.admin_token}, {"name": name})
        token = _find_str(data, ("token",))
        if not token:
            raise UazapError("UAZAP não retornou o token da instância")
        return token

    # ---- Instância ----
    async def set_webhook(self, token: str, url: str) -> None:
        """Assina mensagens e conexão; ignora mensagens enviadas pela API e as do próprio número (evita loop)."""
        await self._request(
            "POST", "/webhook", {"token": token},
            {"enabled": True, "url": url, "events": ["messages", "connection"], "excludeMessages": ["wasSentByApi", "fromMeYes"]},
        )

    async def connect(self, token: str) -> str | None:
        """Inicia o pareamento por QR Code. Retorna data URI da imagem (ou None se já conectado)."""
        data = await self._request("POST", "/instance/connect", {"token": token}, {})
        qr = _find_str(data, ("qrcode", "qrCode", "qr", "base64"))
        if not qr:
            return None
        return qr if qr.startswith("data:") else f"data:image/png;base64,{qr}"

    async def status(self, token: str) -> dict:
        """Retorna {'status': online|qr_pending|disconnected, 'phone': str|None}."""
        data = await self._request("GET", "/instance/status", {"token": token})
        return {"status": map_status(data), "phone": _find_str(data, ("owner", "phone", "number"))}

    async def send_text(self, token: str, number: str, text: str) -> None:
        await self._request("POST", "/send/text", {"token": token}, {"number": number, "text": text})
