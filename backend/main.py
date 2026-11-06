"""Integra Consultoria – API do Agente de IA de WhatsApp."""
import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from database import init_db  # noqa: E402
from routes import candidates, config, dashboard, instances, webhook  # noqa: E402

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Integra Consultoria – Agente WhatsApp", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if o.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(webhook.router, prefix="/api/webhook", tags=["webhook"])
app.include_router(instances.router, prefix="/api/instances", tags=["instances"])
app.include_router(candidates.router, prefix="/api/candidates", tags=["candidates"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(config.router, prefix="/api", tags=["config"])


@app.get("/api/health")
async def health():
    return {"status": "ok"}
