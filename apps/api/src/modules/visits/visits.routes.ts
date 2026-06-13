// src/modules/visits/visits.routes.ts
import { FastifyInstance } from "fastify";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { VisitsService } from "./visits.service.js";
import { createVisitSchema } from "./visits.schema.js";
import { isValidAudioMime } from "../../shared/utils/audio.js";

export async function visitsRoutes(app: FastifyInstance) {
  const service = new VisitsService();

  app.post("/visits", {
    preHandler: [authenticate, authorize(["PHYSICIAN"])],
  }, async (req, reply) => {
    const body = createVisitSchema.parse(req.body);
    const visit = await service.createVisit(body, req.user.id, req.user.hospitalId);
    return reply.status(201).send(visit);
  });

  app.post("/visits/:id/audio", {
    preHandler: [authenticate, authorize(["PHYSICIAN"])],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const data = await req.file();
    if (!data) {
      return reply.status(400).send({ error: "Arquivo de áudio obrigatório" });
    }
    if (!isValidAudioMime(data.mimetype)) {
      return reply.status(400).send({
        error: `Tipo de áudio não suportado: ${data.mimetype}`,
      });
    }
    await service.uploadAndEnqueueAudio(id, data, req.user.hospitalId);
    return reply.status(202).send({ status: "processing" });
  });

  app.get("/visits/:id", {
    preHandler: [authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const visit = await service.getVisit(id, req.user.hospitalId);
    return reply.send(visit);
  });

  app.patch("/conducts/:id/resolve", {
    preHandler: [authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const conduct = await service.resolveConductById(id, req.user.id, req.user.hospitalId);
    return reply.send(conduct);
  });

  app.patch("/pendings/:id/resolve", {
    preHandler: [authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const pending = await service.resolvePendingById(id, req.user.id, req.user.hospitalId);
    return reply.send(pending);
  });

  app.patch("/alerts/:id/acknowledge", {
    preHandler: [authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const alert = await service.acknowledgeAlertById(id, req.user.id, req.user.hospitalId);
    return reply.send(alert);
  });
}
