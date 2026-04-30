// src/modules/visits/visits.routes.ts
import { FastifyInstance } from "fastify";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { VisitsService } from "./visits.service.js";
import { createVisitSchema } from "./visits.schema.js";

export async function visitsRoutes(app: FastifyInstance) {
  const service = new VisitsService();

  // POST /visits
  app.post("/visits", {
    preHandler: [authenticate, authorize(["PHYSICIAN"])],
  }, async (req, reply) => {
    const body = createVisitSchema.parse(req.body);
    const visit = await service.createVisit(body, req.user.id);
    return reply.status(201).send(visit);
  });

  // POST /visits/:id/audio — multipart, inicia processamento
  app.post("/visits/:id/audio", {
    preHandler: [authenticate, authorize(["PHYSICIAN"])],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const data = await req.file();
    if (!data) {
      return reply.status(400).send({ error: "Arquivo de áudio obrigatório" });
    }
    await service.uploadAndEnqueueAudio(id, data);
    return reply.status(202).send({ status: "processing" });
  });

  // GET /visits/:id — inclui conducts, pendings, alerts
  app.get("/visits/:id", {
    preHandler: [authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const visit = await service.getVisit(id);
    return reply.send(visit);
  });

  // PATCH /conducts/:id/resolve
  app.patch("/conducts/:id/resolve", {
    preHandler: [authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const conduct = await service.resolveConductById(id, req.user.id);
    return reply.send(conduct);
  });

  // PATCH /pendings/:id/resolve
  app.patch("/pendings/:id/resolve", {
    preHandler: [authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const pending = await service.resolvePendingById(id, req.user.id);
    return reply.send(pending);
  });

  // PATCH /alerts/:id/acknowledge
  app.patch("/alerts/:id/acknowledge", {
    preHandler: [authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const alert = await service.acknowledgeAlertById(id, req.user.id);
    return reply.send(alert);
  });
}
