# RoundLog — Guia de Arquitetura Backend

> Documento de referência para os devs de backend (P1, P2 e P5). Leia antes de escrever qualquer linha de código.

---

## Stack Obrigatória

| Tecnologia | Versão | Uso |
|---|---|---|
| Node.js | 20 LTS | Runtime |
| Fastify | v4 | Framework HTTP — mais rápido que Express |
| TypeScript | 5.x | Obrigatório em todos os arquivos |
| Prisma | v5 | ORM + migrations |
| PostgreSQL | 15 | Banco principal |
| Zod | v3 | Validação de schemas de request/response |
| Bull | v4 | Fila de processamento assíncrono (áudio) |
| Redis | 7 | Backend da fila Bull |
| JWT + bcrypt | — | Auth |
| Resend | latest | E-mails de notificação |
| Uploadthing ou AWS S3 | — | Storage de arquivos de áudio |

---

## Estrutura de Pastas

```
apps/
  api/
    src/
      server.ts               ← Entry point: instância Fastify + plugins
      app.ts                  ← Registro de rotas e plugins
      
      modules/
        auth/
          auth.routes.ts      ← POST /auth/login, /auth/register, /auth/refresh
          auth.service.ts     ← lógica de negócio
          auth.schema.ts      ← Zod schemas de request/response
        
        hospitals/
          hospitals.routes.ts
          hospitals.service.ts
          hospitals.schema.ts
        
        wards/
          wards.routes.ts     ← CRUD de alas e leitos
          wards.service.ts
          wards.schema.ts
        
        patients/
          patients.routes.ts
          patients.service.ts
          patients.schema.ts
        
        admissions/
          admissions.routes.ts ← abertura/encerramento de internação
          admissions.service.ts
          admissions.schema.ts
        
        visits/
          visits.routes.ts    ← criação, upload de áudio, leitura estruturada
          visits.service.ts   ← orquestra: salva áudio → enfileira processamento
          visits.schema.ts
          visits.processor.ts ← worker Bull: chama Gemini + salva resultado
        
        nursing/
          nursing.routes.ts   ← dashboard de ala, execução de conduta
          nursing.service.ts
          nursing.schema.ts
        
        handoffs/
          handoffs.routes.ts  ← geração e confirmação de plantão
          handoffs.service.ts ← consolida dados + chama LLM para resumo
          handoffs.schema.ts
        
        family/
          family.routes.ts    ← resumo para familiar, mensagens
          family.service.ts
          family.schema.ts
        
        near-misses/
          near-misses.routes.ts
          near-misses.service.ts
          near-misses.schema.ts
        
        analytics/
          analytics.routes.ts ← indicadores para gestão
          analytics.service.ts
          analytics.schema.ts
      
      shared/
        prisma.ts             ← instância singleton do PrismaClient
        gemini.ts             ← instância do cliente Gemini + helpers
        queue.ts              ← instância do Bull + definição de filas
        errors.ts             ← classes de erro customizadas
        middleware/
          authenticate.ts     ← hook Fastify: valida JWT
          authorize.ts        ← hook Fastify: verifica role
        utils/
          audio.ts            ← helpers de conversão de áudio
          date.ts
          hash.ts

      jobs/
        audio.worker.ts       ← processo separado que consome a fila de áudio

    prisma/
      schema.prisma           ← schema completo do banco
      migrations/             ← geradas pelo Prisma automaticamente
      seed.ts                 ← dados para demonstração

    .env                      ← variáveis de ambiente (não comitar)
    .env.example              ← template com todas as variáveis necessárias
```

---

## Schema Prisma Completo

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  name         String
  email        String   @unique
  passwordHash String
  crm          String?  // médico
  coren        String?  // enfermeiro
  role         Role
  hospitalId   String
  hospital     Hospital @relation(fields: [hospitalId], references: [id])
  createdAt    DateTime @default(now())

  visits         Visit[]
  nursingShifts  NursingShift[]
  handoffAcks    HandoffAck[]
}

enum Role {
  ADMIN
  PHYSICIAN
  NURSE
  TECHNICIAN
  MANAGER
}

model Hospital {
  id        String   @id @default(cuid())
  name      String
  cnpj      String   @unique
  createdAt DateTime @default(now())
  users     User[]
  wards     Ward[]
}

model Ward {
  id         String   @id @default(cuid())
  hospitalId String
  hospital   Hospital @relation(fields: [hospitalId], references: [id])
  name       String
  floor      String?
  specialty  String?
  beds       Bed[]
  shifts     NursingShift[]
  handoffs   ShiftHandoff[]
}

model Bed {
  id         String    @id @default(cuid())
  wardId     String
  ward       Ward      @relation(fields: [wardId], references: [id])
  code       String
  status     BedStatus @default(AVAILABLE)
  admissions Admission[]
}

enum BedStatus {
  AVAILABLE
  OCCUPIED
  MAINTENANCE
}

model Patient {
  id         String      @id @default(cuid())
  hospitalId String
  name       String
  dob        DateTime
  cpf        String      @unique
  bloodType  String?
  allergies  String[]
  createdAt  DateTime    @default(now())
  admissions Admission[]
}

model Admission {
  id           String    @id @default(cuid())
  patientId    String
  patient      Patient   @relation(fields: [patientId], references: [id])
  bedId        String
  bed          Bed       @relation(fields: [bedId], references: [id])
  admittedById String
  admittedAt   DateTime  @default(now())
  dischargedAt DateTime?
  diagnosis    String?
  status       AdmissionStatus @default(ACTIVE)
  visits       Visit[]
  familyContacts FamilyContact[]
  familyUpdates  FamilyUpdate[]
  familyMessages FamilyMessage[]
}

enum AdmissionStatus {
  ACTIVE
  DISCHARGED
}

model FamilyContact {
  id          String    @id @default(cuid())
  admissionId String
  admission   Admission @relation(fields: [admissionId], references: [id])
  name        String
  relationship String
  phone       String
  accessToken String    @unique @default(cuid())
}

model Visit {
  id            String      @id @default(cuid())
  admissionId   String
  admission     Admission   @relation(fields: [admissionId], references: [id])
  physicianId   String
  physician     User        @relation(fields: [physicianId], references: [id])
  startedAt     DateTime    @default(now())
  finishedAt    DateTime?
  audioUrl      String?
  transcriptRaw String?
  structuredJson Json?
  status        VisitStatus @default(RECORDING)
  conducts      Conduct[]
  pendings      Pending[]
  alerts        ClinicalAlert[]
  prescriptions Prescription[]
  familyUpdates FamilyUpdate[]
}

enum VisitStatus {
  RECORDING
  PROCESSING
  READY
  ERROR
}

model Conduct {
  id          String        @id @default(cuid())
  visitId     String
  visit       Visit         @relation(fields: [visitId], references: [id])
  description String
  priority    Priority      @default(MEDIUM)
  deadlineAt  DateTime?
  status      ConductStatus @default(OPEN)
  resolvedById String?
  resolvedAt  DateTime?
  executions  NursingExecution[]
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum ConductStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
}

model Pending {
  id             String   @id @default(cuid())
  visitId        String
  visit          Visit    @relation(fields: [visitId], references: [id])
  description    String
  assignedToRole String?
  status         ConductStatus @default(OPEN)
  resolvedById   String?
  resolvedAt     DateTime?
}

model ClinicalAlert {
  id             String   @id @default(cuid())
  visitId        String
  visit          Visit    @relation(fields: [visitId], references: [id])
  type           String   // drug_interaction | allergy | critical_value | fall_risk
  description    String
  severity       String   // critical | warning | info
  acknowledgedById String?
  acknowledgedAt DateTime?
}

model Prescription {
  id          String   @id @default(cuid())
  visitId     String
  visit       Visit    @relation(fields: [visitId], references: [id])
  medication  String
  dose        String
  route       String
  frequency   String
  duration    String?
  notes       String?
}

model NursingShift {
  id        String    @id @default(cuid())
  wardId    String
  ward      Ward      @relation(fields: [wardId], references: [id])
  nurseId   String
  nurse     User      @relation(fields: [nurseId], references: [id])
  startedAt DateTime
  endedAt   DateTime?
  type      ShiftType
  executions NursingExecution[]
  handoffsFrom ShiftHandoff[] @relation("FromShift")
  handoffsTo   ShiftHandoff[] @relation("ToShift")
}

enum ShiftType {
  MORNING
  AFTERNOON
  NIGHT
}

model NursingExecution {
  id         String   @id @default(cuid())
  conductId  String
  conduct    Conduct  @relation(fields: [conductId], references: [id])
  shiftId    String
  shift      NursingShift @relation(fields: [shiftId], references: [id])
  nurseId    String
  executedAt DateTime @default(now())
  notes      String?
  status     String   @default("done") // done | partial | not_possible
}

model ShiftHandoff {
  id           String     @id @default(cuid())
  wardId       String
  ward         Ward       @relation(fields: [wardId], references: [id])
  fromShiftId  String
  fromShift    NursingShift @relation("FromShift", fields: [fromShiftId], references: [id])
  toShiftId    String?
  toShift      NursingShift? @relation("ToShift", fields: [toShiftId], references: [id])
  generatedAt  DateTime   @default(now())
  summaryJson  Json
  status       HandoffStatus @default(PENDING)
  acks         HandoffAck[]
}

enum HandoffStatus {
  PENDING
  ACKNOWLEDGED
}

model HandoffAck {
  id             String      @id @default(cuid())
  handoffId      String
  handoff        ShiftHandoff @relation(fields: [handoffId], references: [id])
  userId         String
  user           User        @relation(fields: [userId], references: [id])
  acknowledgedAt DateTime    @default(now())
  signatureToken String      @unique @default(cuid())
}

model FamilyUpdate {
  id          String    @id @default(cuid())
  admissionId String
  admission   Admission @relation(fields: [admissionId], references: [id])
  visitId     String?
  visit       Visit?    @relation(fields: [visitId], references: [id])
  contentLay  String    // texto em linguagem leiga gerado pelo LLM
  generatedAt DateTime  @default(now())
  readAt      DateTime?
}

model FamilyMessage {
  id          String    @id @default(cuid())
  admissionId String
  admission   Admission @relation(fields: [admissionId], references: [id])
  fromFamily  Boolean   @default(true)
  content     String
  sentAt      DateTime  @default(now())
  readAt      DateTime?
}

model NearMiss {
  id                   String   @id @default(cuid())
  hospitalId           String
  wardId               String?
  reportedAt           DateTime @default(now())
  category             String   // medication | procedure | communication | equipment | fall
  severity             String   // near_miss | no_harm | harm
  description          String
  aiClassificationJson Json?
  isAnonymous          Boolean  @default(true)
}
```

---

## Padrões Obrigatórios

### 1. Estrutura de rota (Fastify)

```typescript
// modules/visits/visits.routes.ts
import { FastifyInstance } from "fastify";
import { authenticate } from "@/shared/middleware/authenticate";
import { authorize } from "@/shared/middleware/authorize";
import { VisitsService } from "./visits.service";
import { createVisitSchema, uploadAudioSchema } from "./visits.schema";

export async function visitsRoutes(app: FastifyInstance) {
  const service = new VisitsService();

  app.post("/visits", {
    preHandler: [authenticate, authorize(["PHYSICIAN"])],
    schema: { body: createVisitSchema },
  }, async (req, reply) => {
    const visit = await service.createVisit(req.body, req.user.id);
    return reply.status(201).send(visit);
  });

  app.post("/visits/:id/audio", {
    preHandler: [authenticate, authorize(["PHYSICIAN"])],
  }, async (req, reply) => {
    const data = await req.file(); // multipart
    await service.uploadAndEnqueueAudio(req.params.id, data);
    return reply.status(202).send({ status: "processing" });
  });

  app.get("/visits/:id", {
    preHandler: [authenticate],
  }, async (req, reply) => {
    const visit = await service.getVisit(req.params.id, req.user);
    return reply.send(visit);
  });
}
```

### 2. Service: separação total de responsabilidades

```typescript
// modules/visits/visits.service.ts
import { prisma } from "@/shared/prisma";
import { audioQueue } from "@/shared/queue";

export class VisitsService {
  async createVisit(data: CreateVisitInput, physicianId: string) {
    return prisma.visit.create({
      data: {
        admissionId: data.admissionId,
        physicianId,
        status: "RECORDING",
      },
    });
  }

  async uploadAndEnqueueAudio(visitId: string, file: MultipartFile) {
    // 1. Salva o arquivo no storage
    const audioUrl = await uploadToStorage(file);

    // 2. Atualiza o visit com a URL e muda status
    await prisma.visit.update({
      where: { id: visitId },
      data: { audioUrl, status: "PROCESSING" },
    });

    // 3. Enfileira o processamento
    await audioQueue.add("process-visit-audio", { visitId, audioUrl });
  }

  async getVisit(id: string, user: AuthUser) {
    return prisma.visit.findUniqueOrThrow({
      where: { id },
      include: { conducts: true, pendings: true, alerts: true, prescriptions: true },
    });
  }
}
```

### 3. Worker de processamento de áudio (Bull)

```typescript
// jobs/audio.worker.ts
import { audioQueue } from "@/shared/queue";
import { gemini } from "@/shared/gemini";
import { prisma } from "@/shared/prisma";

audioQueue.process("process-visit-audio", async (job) => {
  const { visitId, audioUrl } = job.data;

  try {
    // 1. Busca o áudio
    const audioBuffer = await fetchAudioBuffer(audioUrl);

    // 2. Envia para Gemini
    const result = await gemini.processVisitAudio(audioBuffer);

    // 3. Salva o resultado estruturado
    await prisma.$transaction([
      prisma.visit.update({
        where: { id: visitId },
        data: {
          transcriptRaw: result.transcript,
          structuredJson: result,
          status: "READY",
          finishedAt: new Date(),
        },
      }),
      ...result.conducts.map((c) =>
        prisma.conduct.create({ data: { visitId, ...c } })
      ),
      ...result.pendings.map((p) =>
        prisma.pending.create({ data: { visitId, ...p } })
      ),
      ...result.alerts.map((a) =>
        prisma.clinicalAlert.create({ data: { visitId, ...a } })
      ),
      ...result.prescriptions.map((p) =>
        prisma.prescription.create({ data: { visitId, ...p } })
      ),
    ]);
  } catch (error) {
    await prisma.visit.update({
      where: { id: visitId },
      data: { status: "ERROR" },
    });
    throw error; // Bull vai fazer retry automático
  }
});
```

### 4. Integração Gemini — cliente centralizado

```typescript
// shared/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const VISIT_EXTRACTION_PROMPT = `
Você é um assistente clínico especializado em estruturar informações médicas.
Analise o áudio da visita médica e retorne SOMENTE um JSON válido com essa estrutura:
{
  "transcript": "transcrição completa do áudio",
  "conducts": [
    { "description": "...", "priority": "low|medium|high|critical", "deadline_hours": null }
  ],
  "pendings": [
    { "description": "...", "assigned_to": "nursing|lab|pharmacy|radiology" }
  ],
  "alerts": [
    { "type": "drug_interaction|allergy|critical_value|fall_risk|isolation", "severity": "critical|warning|info", "description": "..." }
  ],
  "prescriptions": [
    { "medication": "...", "dose": "...", "route": "oral|iv|im|sc|topic", "frequency": "...", "duration": "..." }
  ]
}
Retorne APENAS o JSON. Sem explicações.
`;

const FAMILY_SUMMARY_PROMPT = `
Você escreve resumos de saúde para familiares de pacientes internados.
Baseado no relatório clínico abaixo, escreva um texto em linguagem simples e empática:
- Máximo 3 parágrafos
- Sem jargão médico
- Tom tranquilizador mas honesto
- Não mencione valores de exame específicos sem contexto
Relatório: {structured_json}
`;

export const gemini = {
  async processVisitAudio(audioBuffer: Buffer): Promise<VisitStructuredData> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const audioPart = {
      inlineData: { data: audioBuffer.toString("base64"), mimeType: "audio/webm" },
    };
    const result = await model.generateContent([VISIT_EXTRACTION_PROMPT, audioPart]);
    const text = result.response.text();
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  },

  async generateFamilySummary(structuredJson: object): Promise<string> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = FAMILY_SUMMARY_PROMPT.replace(
      "{structured_json}",
      JSON.stringify(structuredJson, null, 2)
    );
    const result = await model.generateContent(prompt);
    return result.response.text();
  },

  async generateHandoffSummary(wardData: WardHandoffData): Promise<string> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      Gere um resumo de passagem de plantão claro e direto para a equipe de enfermagem.
      Dados do turno: ${JSON.stringify(wardData, null, 2)}
      Inclua: pacientes em atenção, condutas pendentes, alertas abertos e ocorrências relevantes.
    `;
    const result = await model.generateContent(prompt);
    return result.response.text();
  },
};
```

### 5. Middleware de autenticação

```typescript
// shared/middleware/authenticate.ts
import { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return reply.status(401).send({ error: "Token obrigatório" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    req.user = payload;
  } catch {
    return reply.status(401).send({ error: "Token inválido ou expirado" });
  }
}

// shared/middleware/authorize.ts
export function authorize(roles: Role[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!roles.includes(req.user.role)) {
      return reply.status(403).send({ error: "Sem permissão para esta ação" });
    }
  };
}
```

---

## Variáveis de Ambiente

```env
# apps/api/.env
DATABASE_URL="postgresql://user:password@localhost:5432/roundlog"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="sua-chave-secreta-muito-longa-aqui"
JWT_REFRESH_SECRET="outra-chave-secreta-aqui"
GEMINI_API_KEY="sua-chave-gemini"
STORAGE_URL="uploadthing-ou-s3-url"
RESEND_API_KEY="sua-chave-resend"
PORT=3001
```

---

## Docker Compose (ambiente local)

```yaml
# docker-compose.yml (raiz do projeto)
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: roundlog
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

Subir ambiente: `docker compose up -d`

---

## Endpoints Completos da API

```
AUTH
POST   /auth/register
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout

HOSPITAL / ESTRUTURA
GET    /hospital
POST   /wards
GET    /wards
POST   /wards/:id/beds
GET    /wards/:id/beds

PACIENTES & INTERNAÇÕES
POST   /patients
GET    /patients/:id
POST   /admissions
PATCH  /admissions/:id/discharge
GET    /admissions/:id

VISITAS (core)
POST   /visits
POST   /visits/:id/audio          ← multipart, inicia processamento
GET    /visits/:id                ← inclui conducts, pendings, alerts
PATCH  /conducts/:id/resolve
PATCH  /pendings/:id/resolve
PATCH  /alerts/:id/acknowledge

ENFERMAGEM
GET    /wards/:id/dashboard       ← todos os leitos com status atual
POST   /conducts/:id/execute      ← registro de execução pela enfermagem
GET    /nursing/overdue           ← condutas em atraso

PLANTÃO
POST   /handoffs/generate         ← gera relatório + LLM summary
GET    /handoffs/:id
POST   /handoffs/:id/acknowledge  ← ciência do próximo turno

FAMILIAR
GET    /family/patient/:token/updates
GET    /family/patient/:token/summary
POST   /family/patient/:token/messages

NEAR MISSES
POST   /near-misses
GET    /near-misses/summary       ← apenas gestores
GET    /near-misses/patterns      ← apenas gestores

ANALYTICS (gestores)
GET    /analytics/ward/:id
GET    /analytics/compliance
GET    /analytics/handoffs
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

## Ordem de Desenvolvimento (Semanas 1 e 2)

**Semana 1 — Base:**
- [ ] Setup Fastify + Prisma + PostgreSQL + Docker Compose
- [ ] Migrations com schema completo
- [ ] Auth: register, login, JWT, refresh token
- [ ] CRUD de hospital, wards, beds
- [ ] CRUD de patients e admissions
- [ ] Pipeline de áudio: upload → Bull queue → worker Gemini → salvar resultado
- [ ] Testes do pipeline com áudios reais

**Semana 2 — MVP:**
- [ ] Endpoints de visita completos
- [ ] Dashboard de ala (`GET /wards/:id/dashboard`)
- [ ] Execução de conduta pela enfermagem
- [ ] Geração de relatório de plantão (handoff)
- [ ] Confirmação de ciência do plantão
- [ ] Notificações: conduta em atraso → alerta (in-app primeiro, e-mail depois)
