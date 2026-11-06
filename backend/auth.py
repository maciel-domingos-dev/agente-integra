"""Autenticação simples do painel: senha única -> token assinado (HMAC) com expiração."""
import base64
import hashlib
import hmac
import os
import time

from fastapi import Header, HTTPException

TOKEN_TTL = 60 * 60 * 12  # 12h


def _secret() -> bytes:
    key = os.getenv("SECRET_KEY", "")
    if not key:
        raise RuntimeError("Defina SECRET_KEY no .env")
    return key.encode()


def create_token() -> str:
    exp = str(int(time.time()) + TOKEN_TTL)
    sig = hmac.new(_secret(), exp.encode(), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(f"{exp}.{sig}".encode()).decode()


def verify_token(token: str) -> bool:
    try:
        exp, sig = base64.urlsafe_b64decode(token.encode()).decode().split(".")
        expected = hmac.new(_secret(), exp.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(sig, expected) and int(exp) > time.time()
    except Exception:
        return False


def check_password(password: str) -> bool:
    admin = os.getenv("ADMIN_PASSWORD", "")
    return bool(admin) and hmac.compare_digest(password.encode(), admin.encode())


async def require_admin(authorization: str = Header(default="")) -> None:
    if not authorization.startswith("Bearer ") or not verify_token(authorization[7:]):
        raise HTTPException(status_code=401, detail="Não autorizado")
