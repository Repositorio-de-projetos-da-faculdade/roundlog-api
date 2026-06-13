// src/app.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import fjwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import fstatic from "@fastify/static";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { ZodError } from "zod";
import { join } from "node:path";
import { AppError } from "./shared/errors.js";

// Module routes
import { authRoutes } from "./modules/auth/auth.routes.js";
import { hospitalsRoutes } from "./modules/hospitals/hospitals.routes.js";
import { wardsRoutes } from "./modules/wards/wards.routes.js";
import { patientsRoutes } from "./modules/patients/patients.routes.js";
import { admissionsRoutes } from "./modules/admissions/admissions.routes.js";
import { visitsRoutes } from "./modules/visits/visits.routes.js";
import { nursingRoutes } from "./modules/nursing/nursing.routes.js";
import { shiftsRoutes } from "./modules/shifts/shifts.routes.js";
import { handoffsRoutes } from "./modules/handoffs/handoffs.routes.js";
import { familyRoutes } from "./modules/family/family.routes.js";
import { nearMissesRoutes } from "./modules/near-misses/near-misses.routes.js";
import { analyticsRoutes } from "./modules/analytics/analytics.routes.js";
import { notificationsRoutes } from "./modules/notifications/notifications.routes.js";

export const app = Fastify({
  logger: {
    redact: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.passwordHash",
      "*.password",
      "*.refreshToken",
    ],
    level: process.env.LOG_LEVEL ?? "info",
  },
});

// --- Plugins ---
app.register(helmet, {
  contentSecurityPolicy: false,
});

// CORS com credentials. Origens permitidas via WEB_ORIGINS (csv) — padrão
// inclui as portas locais comuns dos dois apps Next.
const ALLOWED_ORIGINS = (process.env.WEB_ORIGINS ?? "http://localhost:3000,http://localhost:3002")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.register(cors, {
  origin: ALLOWED_ORIGINS,
  credentials: true,
});

app.register(cookie, {
  secret: process.env.COOKIE_SECRET ?? process.env.JWT_REFRESH_SECRET ?? "dev-cookie-secret",
  parseOptions: {},
});

app.register(rateLimit, {
  max: 200,
  timeWindow: "1 minute",
});

app.register(fjwt, {
  secret: process.env.JWT_SECRET ?? "dev-secret",
  sign: { expiresIn: "1d" },
});

app.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

app.register(fstatic, {
  root: join(process.cwd(), "uploads"),
  prefix: "/uploads/",
  decorateReply: false,
});

// --- Global Error Handler ---
app.setErrorHandler((error, _req, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: "Erro de validação",
      details: error.flatten().fieldErrors,
    });
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.message,
    });
  }

  if (error.statusCode === 429) {
    return reply.status(429).send({
      error: "Muitas requisições — tente novamente em alguns instantes",
    });
  }

  app.log.error(error);
  return reply.status(500).send({ error: "Erro interno do servidor" });
});

// --- Routes ---
app.register(authRoutes, { prefix: "/auth" });
app.register(hospitalsRoutes, { prefix: "/" });
app.register(wardsRoutes, { prefix: "/" });
app.register(patientsRoutes, { prefix: "/" });
app.register(admissionsRoutes, { prefix: "/" });
app.register(visitsRoutes, { prefix: "/" });
app.register(nursingRoutes, { prefix: "/" });
app.register(shiftsRoutes, { prefix: "/" });
app.register(handoffsRoutes, { prefix: "/" });
app.register(familyRoutes, { prefix: "/" });
app.register(nearMissesRoutes, { prefix: "/" });
app.register(analyticsRoutes, { prefix: "/" });
app.register(notificationsRoutes, { prefix: "/" });

// --- Health Check ---
app.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});
