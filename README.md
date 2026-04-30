# RoundLog API — Backend de Gestão Clínica Hospitalar

> Sistema de registro e acompanhamento de visitas médicas com processamento de áudio via IA, dashboard de enfermagem, passagem de plantão automatizada e portal para familiares.

---

## Status do Projeto

| Área | Status | Observação |
|---|---|---|
| Infraestrutura (Docker, DB, Redis) | ✅ Pronto | PostgreSQL 15 + Redis 7 via Docker Compose |
| Schema do banco (Prisma) | ✅ Pronto | 20 models, 10 enums, migration aplicada |
| Seed de demonstração | ✅ Pronto | Hospital, 4 usuários, ala, 6 leitos, 2 pacientes, 2 internações |
| Autenticação (JWT) | ✅ Pronto | Register, login, refresh, logout |
| CRUD Hospitais | ✅ Pronto | GET hospital do usuário autenticado |
| CRUD Alas e Leitos | ✅ Pronto | Create/list wards, create/list beds |
| CRUD Pacientes | ✅ Pronto | Create, get com histórico de internações |
| CRUD Internações | ✅ Pronto | Create (ocupa leito), discharge (libera leito), get detalhado |
| Visitas Médicas | ✅ Pronto | Create, get, upload de áudio, resolve condutas/pendências/alertas |
| Dashboard Enfermagem | ✅ Pronto | Dashboard de ala, execução de conduta, condutas em atraso |
| Passagem de Plantão | ✅ Pronto | Geração com LLM, get, acknowledge |
| Portal Familiar | ✅ Pronto | Updates, summary com LLM, mensagens (acesso via token) |
| Near Misses | ✅ Pronto | Registro, summary agregado, patterns |
| Analytics | ✅ Pronto | Ocupação de ala, compliance, handoffs |
| Pipeline de Áudio | ⚠️ Parcial | Estrutura do worker pronta, falta storage local real |
| Integração Gemini | ⚠️ Parcial | Cliente pronto, falta API key e testes com áudio real |
| E-mails (Resend) | ❌ Pendente | Nenhum e-mail implementado |
| Testes | ❌ Pendente | Nenhum teste escrito |
| Notificações | ❌ Pendente | Alertas de conduta em atraso não implementados |

---

## Stack

| Tecnologia | Versão | Uso |
|---|---|---|
| Node.js | 20 LTS | Runtime |
| Fastify | v4 | Framework HTTP |
| TypeScript | 5.x | Tipagem em todos os arquivos |
| Prisma | v5 | ORM + migrations |
| PostgreSQL | 15 | Banco principal (via Docker) |
| Zod | v3 | Validação de schemas |
| BullMQ | v5 | Fila de processamento assíncrono |
| Redis | 7 | Backend da fila BullMQ (via Docker) |
| JWT (Fastify JWT) | — | Autenticação |
| bcryptjs | — | Hash de senhas |
| Gemini AI | — | Processamento de áudio e geração de resumos |
| Resend | — | E-mails de notificação (não implementado) |
| Storage Local | — | Arquivos de áudio salvos localmente |

---

## Como Rodar

### Pré-requisitos

- Node.js 20+
- Docker e Docker Compose
- npm

### 1. Subir os containers (PostgreSQL + Redis)

```bash
docker compose up -d
```

### 2. Instalar dependências

```bash
cd apps/api
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env com suas chaves (Gemini, Resend, etc.)
```

### 4. Rodar migrations e seed

```bash
npm run db:migrate
npm run db:seed
```

### 5. Iniciar o servidor

```bash
npm run dev
```

O servidor inicia em `http://localhost:3001`.

### Usuários demo (senha: `123456`)

| E-mail | Role | Permissões |
|---|---|---|
| `admin@roundlog.dev` | ADMIN | Acesso total |
| `joao@roundlog.dev` | PHYSICIAN | Visitas, internações, pacientes |
| `maria@roundlog.dev` | NURSE | Dashboard, execução de condutas |
| `carlos@roundlog.dev` | MANAGER | Analytics, near misses, relatórios |

---

## Estrutura de Pastas

```
apps/
  api/
    src/
      server.ts                     ← Entry point
      app.ts                        ← Registro de rotas, plugins e error handler

      modules/
        auth/
          auth.routes.ts             ← POST /auth/login, /register, /refresh, /logout
          auth.service.ts            ← Lógica de register e login
          auth.schema.ts             ← Zod: registerSchema, loginSchema, refreshSchema

        hospitals/
          hospitals.routes.ts        ← GET /hospital
          hospitals.service.ts       ← getHospital, createHospital
          hospitals.schema.ts        ← Zod: createHospitalSchema

        wards/
          wards.routes.ts            ← POST/GET /wards, POST/GET /wards/:id/beds
          wards.service.ts           ← CRUD wards + beds (scoped por hospital)
          wards.schema.ts            ← Zod: createWardSchema, createBedSchema

        patients/
          patients.routes.ts         ← POST /patients, GET /patients/:id
          patients.service.ts        ← createPatient (verifica CPF), getPatient
          patients.schema.ts         ← Zod: createPatientSchema

        admissions/
          admissions.routes.ts       ← POST /admissions, PATCH discharge, GET /:id
          admissions.service.ts      ← create (ocupa leito via $transaction), discharge (libera)
          admissions.schema.ts       ← Zod: createAdmissionSchema

        visits/
          visits.routes.ts           ← POST /visits, POST audio, GET, PATCH resolve/ack
          visits.service.ts          ← create, uploadAndEnqueue, get, resolve, acknowledge
          visits.schema.ts           ← Zod: createVisitSchema
          visits.processor.ts        ← Worker BullMQ: Gemini + salva resultado

        nursing/
          nursing.routes.ts          ← GET dashboard, POST execute, GET overdue
          nursing.service.ts         ← getWardDashboard, executeConduct, getOverdue
          nursing.schema.ts          ← Zod: executeConductSchema

        handoffs/
          handoffs.routes.ts         ← POST generate, GET /:id, POST acknowledge
          handoffs.service.ts        ← generateHandoff (LLM), getHandoff, acknowledge
          handoffs.schema.ts         ← Zod: generateHandoffSchema

        family/
          family.routes.ts           ← GET updates, GET summary, POST messages
          family.service.ts          ← getUpdates, getSummary (LLM), sendMessage
          family.schema.ts           ← Zod: sendMessageSchema

        near-misses/
          near-misses.routes.ts      ← POST create, GET summary, GET patterns
          near-misses.service.ts     ← create, getSummary (groupBy), getPatterns
          near-misses.schema.ts      ← Zod: createNearMissSchema

        analytics/
          analytics.routes.ts        ← GET ward/:id, GET compliance, GET handoffs
          analytics.service.ts       ← wardAnalytics, compliance, handoffMetrics
          analytics.schema.ts        ← Zod: wardAnalyticsParams

      shared/
        prisma.ts                    ← Singleton PrismaClient
        gemini.ts                    ← Cliente Gemini AI + prompts + tipos
        queue.ts                     ← BullMQ queue + Redis connection
        errors.ts                    ← AppError, UnauthorizedError, ForbiddenError, etc.
        middleware/
          authenticate.ts            ← Hook JWT: valida token, popula req.user
          authorize.ts               ← Hook de role: verifica permissão
        utils/
          audio.ts                   ← Validação de MIME, geração de nomes
          date.ts                    ← Formatação BR, isOverdue, addHours
          hash.ts                    ← hashPassword, verifyPassword (bcryptjs)

      jobs/
        audio.worker.ts              ← Entry point do worker de áudio (processo separado)

    prisma/
      schema.prisma                  ← Schema completo (20 models, 10 enums)
      migrations/                    ← Migration initial_schema aplicada
      seed.ts                        ← Dados de demonstração

    .env                             ← Variáveis de ambiente (não comitar)
    .env.example                     ← Template
    package.json
    tsconfig.json
```

---

## Endpoints Implementados

### 🔓 Auth (sem autenticação)

| Método | Rota | Descrição | Status |
|---|---|---|---|
| `POST` | `/auth/register` | Cadastra novo usuário | ✅ |
| `POST` | `/auth/login` | Login → retorna JWT + refresh token | ✅ |
| `POST` | `/auth/refresh` | Renova JWT com refresh token | ✅ |
| `POST` | `/auth/logout` | Logout (client-side) | ✅ |

### 🏥 Hospital (autenticado)

| Método | Rota | Descrição | Roles | Status |
|---|---|---|---|---|
| `GET` | `/hospital` | Dados do hospital do usuário | Todos | ✅ |

### 🏢 Alas e Leitos (autenticado)

| Método | Rota | Descrição | Roles | Status |
|---|---|---|---|---|
| `POST` | `/wards` | Cria nova ala | ADMIN, MANAGER | ✅ |
| `GET` | `/wards` | Lista alas do hospital | Todos | ✅ |
| `POST` | `/wards/:id/beds` | Cria leito em uma ala | ADMIN, MANAGER | ✅ |
| `GET` | `/wards/:id/beds` | Lista leitos de uma ala | Todos | ✅ |

### 🧑‍⚕️ Pacientes (autenticado)

| Método | Rota | Descrição | Roles | Status |
|---|---|---|---|---|
| `POST` | `/patients` | Cadastra paciente (verifica CPF único) | Todos | ✅ |
| `GET` | `/patients/:id` | Dados do paciente + internações | Todos | ✅ |

### 🛏️ Internações (autenticado)

| Método | Rota | Descrição | Roles | Status |
|---|---|---|---|---|
| `POST` | `/admissions` | Abre internação (ocupa leito via `$transaction`) | PHYSICIAN, ADMIN | ✅ |
| `PATCH` | `/admissions/:id/discharge` | Alta (libera leito via `$transaction`) | PHYSICIAN, ADMIN | ✅ |
| `GET` | `/admissions/:id` | Internação com paciente, leito, visitas, contatos | Todos | ✅ |

### 📋 Visitas Médicas (autenticado)

| Método | Rota | Descrição | Roles | Status |
|---|---|---|---|---|
| `POST` | `/visits` | Inicia nova visita | PHYSICIAN | ✅ |
| `POST` | `/visits/:id/audio` | Upload de áudio (multipart) → enfileira processamento | PHYSICIAN | ⚠️ Falta storage local |
| `GET` | `/visits/:id` | Visita completa com condutas, pendências, alertas, prescrições | Todos | ✅ |
| `PATCH` | `/conducts/:id/resolve` | Resolve uma conduta | Todos | ✅ |
| `PATCH` | `/pendings/:id/resolve` | Resolve uma pendência | Todos | ✅ |
| `PATCH` | `/alerts/:id/acknowledge` | Ciência de um alerta clínico | Todos | ✅ |

### 👩‍⚕️ Enfermagem (autenticado)

| Método | Rota | Descrição | Roles | Status |
|---|---|---|---|---|
| `GET` | `/wards/:id/dashboard` | Dashboard da ala com todos os leitos e status | Todos | ✅ |
| `POST` | `/conducts/:id/execute` | Registra execução de conduta | NURSE, TECHNICIAN | ✅ |
| `GET` | `/nursing/overdue` | Lista condutas em atraso | Todos | ✅ |

### 🔄 Passagem de Plantão (autenticado)

| Método | Rota | Descrição | Roles | Status |
|---|---|---|---|---|
| `POST` | `/handoffs/generate` | Gera relatório + resumo via LLM | NURSE, ADMIN | ⚠️ Depende da API key Gemini |
| `GET` | `/handoffs/:id` | Detalhes do handoff | Todos | ✅ |
| `POST` | `/handoffs/:id/acknowledge` | Registra ciência do próximo turno | Todos | ✅ |

### 👨‍👩‍👧 Portal Familiar (sem autenticação — acesso via token)

| Método | Rota | Descrição | Status |
|---|---|---|---|
| `GET` | `/family/patient/:token/updates` | Lista atualizações do paciente | ✅ |
| `GET` | `/family/patient/:token/summary` | Resumo em linguagem leiga (LLM) | ⚠️ Depende da API key Gemini |
| `POST` | `/family/patient/:token/messages` | Envia mensagem para a equipe | ✅ |

### ⚠️ Near Misses (autenticado)

| Método | Rota | Descrição | Roles | Status |
|---|---|---|---|---|
| `POST` | `/near-misses` | Registra quase-erro (anônimo ou não) | Todos | ✅ |
| `GET` | `/near-misses/summary` | Resumo agregado por categoria e severidade | MANAGER, ADMIN | ✅ |
| `GET` | `/near-misses/patterns` | Padrões dos últimos 30 dias | MANAGER, ADMIN | ✅ |

### 📊 Analytics (autenticado)

| Método | Rota | Descrição | Roles | Status |
|---|---|---|---|---|
| `GET` | `/analytics/ward/:id` | Ocupação da ala (total, ocupados, taxa) | MANAGER, ADMIN | ✅ |
| `GET` | `/analytics/compliance` | Taxa de resolução de condutas | MANAGER, ADMIN | ✅ |
| `GET` | `/analytics/handoffs` | Taxa de ciência dos plantões | MANAGER, ADMIN | ✅ |

### 🔧 Infraestrutura

| Método | Rota | Descrição | Status |
|---|---|---|---|
| `GET` | `/health` | Health check | ✅ |

**Total: 33 endpoints implementados**

---

## Schema do Banco (Prisma)

### Models (20)

| Model | Descrição | Relacionamentos principais |
|---|---|---|
| `User` | Profissionais do hospital | → Hospital, → Visits, → NursingShifts |
| `Hospital` | Unidade hospitalar | → Users, → Wards |
| `Ward` | Ala/setor do hospital | → Hospital, → Beds, → Shifts, → Handoffs |
| `Bed` | Leito individual | → Ward, → Admissions |
| `Patient` | Paciente cadastrado | → Admissions |
| `Admission` | Internação ativa ou encerrada | → Patient, → Bed, → Visits, → FamilyContacts |
| `FamilyContact` | Contato familiar com token de acesso | → Admission |
| `Visit` | Visita médica (registro + áudio) | → Admission, → Physician, → Conducts, → Alerts |
| `Conduct` | Conduta médica extraída da visita | → Visit, → NursingExecutions |
| `Pending` | Pendência (lab, farmácia, etc.) | → Visit |
| `ClinicalAlert` | Alerta clínico (interação, alergia) | → Visit |
| `Prescription` | Prescrição médica | → Visit |
| `NursingShift` | Turno de enfermagem | → Ward, → Nurse, → Executions |
| `NursingExecution` | Execução de conduta pela enfermagem | → Conduct, → Shift |
| `ShiftHandoff` | Passagem de plantão | → Ward, → FromShift, → ToShift, → Acks |
| `HandoffAck` | Ciência da passagem | → Handoff, → User |
| `FamilyUpdate` | Atualização para familiar (linguagem leiga) | → Admission, → Visit |
| `FamilyMessage` | Mensagem entre familiar e equipe | → Admission |
| `NearMiss` | Registro de quase-erro | Standalone (hospitalId, wardId) |

### Enums (10)

`Role` · `BedStatus` · `AdmissionStatus` · `VisitStatus` · `Priority` · `ConductStatus` · `ShiftType` · `HandoffStatus`

---

## O Que Falta Fazer

### 🔴 Prioridade Alta

#### 1. Storage Local de Áudio
**Arquivo:** `src/modules/visits/visits.service.ts`

O upload de áudio atualmente salva a URL como `local://uploads/visits/...` (placeholder). Precisa:
- Criar pasta `uploads/` no projeto
- Salvar o buffer do arquivo no disco local usando `fs.writeFile`
- Servir os arquivos via rota estática do Fastify (`@fastify/static`)
- Atualizar o `visits.service.ts` para salvar o caminho real

#### 2. Worker de Áudio Funcional
**Arquivo:** `src/modules/visits/visits.processor.ts`

O worker tem `Buffer.from("placeholder")` no lugar do fetch real. Precisa:
- Ler o arquivo de áudio do disco local (usando o caminho salvo no banco)
- Enviar o buffer real para o Gemini
- Tratar erros de arquivo não encontrado

#### 3. Configurar API Key do Gemini
**Arquivo:** `.env`

Substituir `GEMINI_API_KEY="sua-chave-gemini"` por uma chave real. Sem isso, os endpoints que dependem de IA (handoff generate, family summary, audio processing) vão falhar.

#### 4. Classificação AI de Near Misses
**Arquivo:** `src/modules/near-misses/near-misses.service.ts`

O campo `aiClassificationJson` existe no banco mas nunca é preenchido. Precisa:
- Criar prompt no `gemini.ts` para classificar near misses
- Chamar o Gemini no `create()` do service para classificar automaticamente
- Salvar o resultado no campo `aiClassificationJson`

---

### 🟡 Prioridade Média

#### 5. Notificações de Conduta em Atraso
O README original pede: "conduta em atraso → alerta (in-app primeiro, e-mail depois)".

Precisa criar:
- Um job agendado (cron via BullMQ) que roda a cada X minutos
- Verifica condutas com `deadlineAt < now()` e `status != RESOLVED`
- Cria registro de notificação (modelo novo ou in-memory)
- Futuramente: enviar e-mail via Resend

#### 6. E-mails via Resend
**Arquivos a criar:** `src/shared/resend.ts`

Cenários de e-mail previstos:
- Notificação de conduta em atraso para enfermagem
- Confirmação de cadastro
- Alerta crítico para o médico responsável

Precisa:
- Criar o cliente Resend em `shared/resend.ts`
- Criar templates de e-mail
- Integrar nos pontos certos (services)

#### 7. Geração Automática de FamilyUpdate
**Arquivo:** `src/modules/visits/visits.processor.ts`

Quando o worker processa uma visita e o status vira `READY`, deveria automaticamente:
- Chamar `gemini.generateFamilySummary()` com o `structuredJson`
- Criar um `FamilyUpdate` para cada `FamilyContact` da internação

#### 8. Refresh Token Seguro
**Arquivo:** `src/modules/auth/auth.routes.ts`

Atualmente o refresh token é um JWT simples sem invalidação. Para produção:
- Salvar refresh tokens no banco ou Redis
- Implementar rotação de token (cada refresh gera novo refresh token)
- Invalidar tokens no logout
- Verificar se o token não foi revogado antes de renovar

---

### 🟢 Prioridade Baixa (Polish)

#### 9. Testes
Precisa configurar framework de testes e criar:
- Testes unitários dos services
- Testes de integração dos endpoints (usando Fastify inject)
- Testes do pipeline de áudio com mock do Gemini

#### 10. Validações Mais Robustas
- Verificar que `hospitalId` do recurso bate com o do usuário em todas as rotas
- Validar que o médico da visita pertence ao mesmo hospital da internação
- Verificar que o leito pertence à mesma ala do hospital

#### 11. Rate Limiting e Segurança
- Adicionar `@fastify/rate-limit`
- Adicionar `@fastify/helmet`
- Sanitização de inputs
- Logs sem dados sensíveis (senha, tokens)

#### 12. Seed Avançado
- Adicionar visitas com `structuredJson` preenchido
- Adicionar condutas, alertas e prescrições demo
- Adicionar near misses de exemplo
- Adicionar handoffs de exemplo

#### 13. Analytics Avançados
- Filtro por período (query params `from` e `to`)
- Tendências (comparação entre períodos)
- Métricas por profissional

---

## Variáveis de Ambiente

```env
DATABASE_URL="postgresql://user:password@localhost:5432/roundlog"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="sua-chave-secreta-muito-longa-aqui"
JWT_REFRESH_SECRET="outra-chave-secreta-aqui"
GEMINI_API_KEY="sua-chave-gemini"
STORAGE_URL="local"
RESEND_API_KEY="sua-chave-resend"
PORT=3001
```

---

## Regras de Ouro

1. **Nunca retornar dados de outro hospital** — sempre filtrar por `hospitalId` do usuário autenticado
2. **Toda rota protegida tem `preHandler: [authenticate]`** — sem exceção
3. **Lógica de negócio no service, nunca na rota**
4. **Validação de input com Zod antes de chegar no service**
5. **Toda operação de banco crítica usa `prisma.$transaction`**
6. **Processamento de áudio é sempre assíncrono** — resposta 202 imediata + worker
7. **Erros conhecidos têm status HTTP correto** — 400 validação, 401 auth, 403 permissão, 404 não encontrado, 409 conflito
8. **Nenhuma senha, token ou chave em logs**

---

## Scripts Disponíveis

```bash
npm run dev          # Inicia servidor em modo watch (tsx watch)
npm run build        # Compila TypeScript
npm run start        # Roda build compilado
npm run db:migrate   # Roda migrations Prisma
npm run db:push      # Push schema sem migration
npm run db:seed      # Seed do banco com dados demo
npm run db:studio    # Abre Prisma Studio (GUI do banco)
npm run db:generate  # Gera Prisma Client
```

---

## Docker Compose

```bash
docker compose up -d     # Sobe PostgreSQL + Redis
docker compose down      # Para os containers
docker compose logs -f   # Acompanha logs
```
