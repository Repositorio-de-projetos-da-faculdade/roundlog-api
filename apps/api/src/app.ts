// src/app.ts
import Fastify from "fastify";
import cors from "@fastify/cors";
import fjwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { ZodError } from "zod";
import { AppError } from "./shared/errors.js";

// Module routes
import { authRoutes } from "./modules/auth/auth.routes.js";
import { hospitalsRoutes } from "./modules/hospitals/hospitals.routes.js";
import { wardsRoutes } from "./modules/wards/wards.routes.js";
import { patientsRoutes } from "./modules/patients/patients.routes.js";
import { admissionsRoutes } from "./modules/admissions/admissions.routes.js";
import { visitsRoutes } from "./modules/visits/visits.routes.js";
import { nursingRoutes } from "./modules/nursing/nursing.routes.js";
import { handoffsRoutes } from "./modules/handoffs/handoffs.routes.js";
import { familyRoutes } from "./modules/family/family.routes.js";
import { nearMissesRoutes } from "./modules/near-misses/near-misses.routes.js";
import { analyticsRoutes } from "./modules/analytics/analytics.routes.js";

export const app = Fastify({
  logger: true,
});

// --- Plugins ---
app.register(cors, { origin: true });

app.register(fjwt, {
  secret: process.env.JWT_SECRET ?? "dev-secret",
  sign: { expiresIn: "1d" },
});

app.register(multipart, {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
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

  // Erros não tratados
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
app.register(handoffsRoutes, { prefix: "/" });
app.register(familyRoutes, { prefix: "/" });
app.register(nearMissesRoutes, { prefix: "/" });
app.register(analyticsRoutes, { prefix: "/" });

// --- Health Check ---
app.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});
