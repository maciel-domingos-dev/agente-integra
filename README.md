# Integra Consultoria · Painel do Agente de IA (WhatsApp)

Painel administrativo + backend do agente de recrutamento que atende candidatos (Estágio e CLT) pelo WhatsApp usando Claude, com suporte a múltiplos números (um por recrutador/setor).

```
frontend/   Next.js 14 (App Router) · React · TypeScript · Tailwind · Recharts · Lucide
backend/    FastAPI (async) · SQLAlchemy · SDK `anthropic` · httpx (UAZAP)
```

## Fluxo

```
Candidato ─WhatsApp─▶ UAZAP ─POST /api/webhook/whatsapp?secret=…─▶ FastAPI
                                                                    │ salva mensagem
                                                                    │ Claude (histórico + System Prompt)
Candidato ◀─WhatsApp─ UAZAP ◀─ POST /send/text ─────────────────────┘ salva resposta + atualiza triagem
```

- O webhook responde `200` imediatamente e processa em background.
- Se o **Agente de IA** estiver desligado no número (toggle em *Instâncias*) ou a triagem estiver em **Transbordo humano**, a mensagem é só registrada — o Claude não responde.
- O Claude termina cada resposta com um bloco `<meta>{...}</meta>` (nome, modalidade, vaga, status). O backend o **remove antes de enviar** ao candidato e usa os dados para atualizar o CRM. Não apague esse trecho do System Prompt.

## Como rodar

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env              # edite os valores
uvicorn main:app --reload --port 8000
```
Docs interativas: http://localhost:8000/docs · Tabelas são criadas automaticamente no start.

### Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev                       # http://localhost:3000
```
Produção: `npm run build && npm start`.

Na tela de login, a senha é o `ADMIN_PASSWORD` do backend. Com `NEXT_PUBLIC_DEMO_FALLBACK=true` aparece também o botão **Ver modo demonstração** (dados fictícios, sem backend) — desative em produção.

## Variáveis de ambiente

### `backend/.env`
| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | `sqlite+aiosqlite:///./integra.db` (dev) ou `postgresql+asyncpg://user:senha@host:5432/integra` |
| `ADMIN_PASSWORD` | sim | Senha de login do painel |
| `SECRET_KEY` | sim | Assina os tokens de sessão (12h). Gere: `python -c "import secrets;print(secrets.token_hex(32))"` |
| `CORS_ORIGINS` | sim | Origens do frontend, separadas por vírgula (ex.: `https://painel.integra.com.br`) |
| `ANTHROPIC_API_KEY` | * | Chave `sk-ant-...` (pode ser definida/alterada em *Configurações*) |
| `ANTHROPIC_MODEL` | não | Padrão `claude-sonnet-5-5` |
| `UAZAP_BASE_URL` | * | URL do servidor UAZAP (ex.: `https://seu-subdominio.uazapi.com`) |
| `UAZAP_ADMIN_TOKEN` | * | Admin token da UAZAP (header `admintoken`); só no backend |
| `WEBHOOK_SECRET` | sim | Segredo anexado à URL do webhook (`?secret=`), pois a UAZAP não envia headers customizados |
| `PUBLIC_BACKEND_URL` | sim | URL pública **HTTPS** do backend; registrada como webhook em cada instância nova |

\* Podem vir do `.env` ou ser salvas pelo painel (o valor do painel tem prioridade). O painel nunca devolve segredos completos, só versões mascaradas.

### `frontend/.env.local`
| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL do backend (ex.: `http://localhost:8000`) |
| `NEXT_PUBLIC_DEMO_FALLBACK` | `true` habilita o modo demonstração na tela de login |

## Endpoints principais
| Método | Rota | Auth |
|---|---|---|
| POST | `/api/webhook/whatsapp` | `?secret=` + token da instância no payload |
| POST | `/api/auth/login` | — |
| GET/POST | `/api/instances` (POST cria na UAZAP + registra webhook) | Bearer |
| POST | `/api/instances/{id}/qrcode` (gera QR) | Bearer |
| GET | `/api/instances/{id}/status` (status real na UAZAP) | Bearer |
| POST | `/api/instances/{id}/webhook` (reconfigura webhook) | Bearer |
| PATCH | `/api/instances/{id}/agent` | Bearer |
| GET | `/api/candidates`, `/api/candidates/{id}/messages` | Bearer |
| GET | `/api/dashboard` | Bearer |
| GET/PUT | `/api/config` | Bearer |

## Integração UAZAP
Endpoints usados (docs.uazapi.com): `POST /instance/create` (`admintoken`), `POST /webhook`, `POST /instance/connect`, `GET /instance/status`, `POST /send/text` (header `token` da instância). O webhook é registrado com `events: ["messages","connection"]` e `excludeMessages: ["wasSentByApi","fromMeYes"]` para o agente não responder às próprias mensagens. O token de cada instância fica no banco e é usado para identificar de qual número veio a mensagem.

A documentação pública não detalha o formato das respostas de `/instance/connect` e `/instance/status`; `services/whatsapp_service.py` busca o QR nas chaves `qrcode`/`qr`/`base64` e o status em `status`/`state`. Se o seu servidor responder diferente, ajuste `connect()` e `map_status()` ali.

**Bancos já criados:** a tabela `instances` ganhou `token` e `evolution_name` virou `uazap_name`. O `create_all` não migra tabelas existentes — apague o `integra.db` de desenvolvimento (ou use Alembic em produção).

## Modelos Claude
O painel oferece `claude-sonnet-5-5` (triagem detalhada) e `claude-haiku-5-5` (respostas rápidas). Os IDs `claude-3-5-*` do briefing original são de uma geração antiga e podem não estar mais disponíveis na API. Para trocar a lista, edite `ALLOWED_MODELS` em `backend/routes/config.py` e `MODELS` em `frontend/app/configuracoes/page.tsx`.

## Checklist de produção
- Servir backend e frontend atrás de HTTPS.
- Usar PostgreSQL; rodar o backend com mais de um worker só após trocar os locks em memória do webhook por um lock distribuído (ex.: Redis).
- Trocar `ADMIN_PASSWORD`/`SECRET_KEY`/`WEBHOOK_SECRET` por valores fortes e desativar o modo demonstração.
- A autenticação é de senha única (sem usuários individuais). Para equipes maiores, evolua para login por usuário.
- Tratar a LGPD: as conversas contêm dados pessoais de candidatos; defina retenção e base legal.
