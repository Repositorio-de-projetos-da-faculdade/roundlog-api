// src/modules/handoffs/handoffs.routes.ts
import { FastifyInstance } from "fastify";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { HandoffsService } from "./handoffs.service.js";
import { generateHandoffSchema } from "./handoffs.schema.js";

export async function handoffsRoutes(app: FastifyInstance) {
  const service = new HandoffsService();

  app.post("/handoffs/generate", {
    preHandler: [authenticate, authorize(["NURSE", "ADMIN"])],
  }, async (req, reply) => {
    const body = generateHandoffSchema.parse(req.body);
    const handoff = await service.generateHandoff(body, req.user.hospitalId);
    return reply.status(201).send(handoff);
  });

  app.get("/handoffs/:id", {
    preHandler: [authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const handoff = await service.getHandoff(id, req.user.hospitalId);
    return reply.send(handoff);
  });

  app.post("/handoffs/:id/acknowledge", {
    preHandler: [authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const ack = await service.acknowledgeHandoff(id, req.user.id, req.user.hospitalId);
    return reply.status(201).send(ack);
  });
}
