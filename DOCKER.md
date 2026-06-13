# 🐳 Subir o RoundLog inteiro em 2 passos

Este guia sobe o **stack completo** (API + Worker + Web + PWA + Postgres + Redis)
com Docker. Você não precisa instalar Node, Postgres, Redis nem nada além
do Docker no seu computador.

---

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e rodando
- Git
- ~3GB livres em disco

---

## Passo 0 — Clonar os 2 repositórios lado a lado

```bash
# Em qualquer pasta de trabalho (ex.: ~/Workspace, C:\dev, etc.)
mkdir roundlog && cd roundlog
git clone https://github.com/SEU-USUARIO/roundlog-api.git
git clone https://github.com/SEU-USUARIO/roundlog-web.git
```

> Estrutura final esperada:
> ```
> roundlog/
>   ├─ roundlog-api/   ← contém docker-compose.yml
>   └─ roundlog-web/
> ```

## Passo 1 — Configurar a chave da IA

```bash
cd roundlog-api
cp .env.example .env
```

Edite o `.env` e preencha **apenas a Gemini key** (o resto pode ficar como
está pra demo local):

```env
GEMINI_API_KEY=AIza...sua-chave-aqui
```

> Gere uma chave grátis em https://aistudio.google.com/app/apikey
> (login com Google). Sem essa chave, o fluxo de áudio não funciona —
> todo o resto (login, internações, plantão, near-misses) funciona normalmente.

## Passo 2 — Subir

```bash
docker compose up --build
```

A primeira vez demora ~5 min (baixar imagens, instalar deps). Depois disso
sobe em ~30s.

---

## 🌐 URLs

Quando o log mostrar `roundlog-api  ✅ Servidor pronto`:

| URL | Quem usa |
|---|---|
| http://localhost:3000 | **Web** — dashboard médico/gestor (desktop) |
| http://localhost:3002 | **PWA** — mobile pra enfermagem + portal família |
| http://localhost:3001/health | health check da API |

---

## 👥 Logins de demo (criados pelo seed automático)

| E-mail | Senha | Papel |
|---|---|---|
| admin@roundlog.dev | password123 | Admin (tudo liberado) |
| joao@roundlog.dev | password123 | Médico |
| ricardo@roundlog.dev | password123 | Médico |
| maria@roundlog.dev | password123 | Enfermeira |
| beatriz@roundlog.dev | password123 | Enfermeira |
| carlos@roundlog.dev | password123 | Gestor |

---

## 🧭 Fluxo principal pra demo

1. Abra http://localhost:3000 e faça login como `joao@roundlog.dev`
2. Vá em **Internações** → escolha um paciente
3. Clique em **Nova visita** → grave alguns segundos falando sobre o paciente
4. Aguarde ~10s (worker + Gemini processando)
5. A página da visita carrega com transcrição, condutas e prescrições extraídas
6. Em **Contatos familiares**, clique em **Copiar link** → abra esse link no
   celular ou em guia anônima (porta 3002) → portal família com gráfico de evolução

---

## 🧰 Comandos úteis

```bash
# Subir em background (sem prender o terminal)
docker compose up -d --build

# Ver logs ao vivo
docker compose logs -f api worker

# Resetar tudo (apaga banco e áudios)
docker compose down -v

# Rodar testes da API
docker compose exec api npm test

# Abrir um shell dentro do container
docker compose exec api sh

# Resetar só o banco e re-popular
docker compose exec api npx prisma migrate reset --force
```

---

## 🗺️ Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser do usuário                     │
└─────────────┬────────────────────────┬──────────────────────┘
              │                        │
        :3000 │                  :3002 │
              ▼                        ▼
       ┌────────────┐           ┌────────────┐
       │  Web Next  │           │  PWA Next  │
       │ (desktop)  │           │  (mobile)  │
       └─────┬──────┘           └─────┬──────┘
             │       :3001            │
             └────────┬───────────────┘
                      ▼
              ┌───────────────┐
              │  Fastify API  │
              └───┬───────┬───┘
                  │       │
         Postgres │       │ Redis
          :5433   ▼       ▼ :6380
              ┌──────┐ ┌──────┐
              │  DB  │ │ Fila │
              └──────┘ └──┬───┘
                          │
                          ▼
                  ┌──────────────┐
                  │ Worker BullMQ│
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Google Gemini│
                  │  (audio→IA)  │
                  └──────────────┘
```

**Volumes persistentes:**
- `postgres_data` — dados do banco
- `audio_storage` — `.webm` das visitas (compartilhado entre `api` e `worker`)
- `*_node_modules` — node_modules de cada serviço (cache de instalação)

---

## ❓ Troubleshooting

**Porta 3000/3001/3002/5433/6380 já em uso**
Algum app local (outro projeto, Postgres do sistema) tá usando essas portas.
Pare-os ou edite o `ports:` no `docker-compose.yml`.

**Subiu mas o login dá erro de rede**
Confira no log se o `migrator` saiu com `exit 0` antes da API subir. Se não,
o banco não foi populado: `docker compose up migrator` re-executa só ele.

**Áudio fica em PROCESSING pra sempre**
Worker travou ou Gemini key inválida. `docker compose logs worker` mostra o erro.

**"GEMINI_API_KEY ausente"**
Você esqueceu de preencher o `.env`. Edite, depois `docker compose restart api worker`.

**Hot reload não funciona no Windows**
Sintoma raro do Docker Desktop em alguns Windows. Workaround: salvar o
arquivo 2x ou trocar pro backend WSL2 nas configurações do Docker Desktop.

**A pasta `roundlog-web/` não existe**
Você esqueceu de clonar o repo do frontend. Volte pro Passo 0 e clone
`roundlog-web` lado a lado com este repo.

---

## 📚 Tech stack

| Camada | Tech |
|---|---|
| API | Fastify 4 + Prisma 5 + Postgres 15 |
| Filas | BullMQ + Redis 7 |
| IA | Google Gemini 2.5 Flash (multimodal: áudio→JSON) |
| E-mail | Resend (opcional) |
| Push | Web Push API + VAPID (opcional) |
| Frontend | Next.js 14 (App Router) + TanStack Query + Zustand |
| UI | shadcn/ui + Tailwind CSS |
| Container | Docker Compose |
