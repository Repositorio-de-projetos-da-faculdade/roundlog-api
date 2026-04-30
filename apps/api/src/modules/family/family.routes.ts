// src/modules/family/family.routes.ts
import { FastifyInstance } from "fastify";
import { FamilyService } from "./family.service.js";
import { sendMessageSchema } from "./family.schema.js";

export async function familyRoutes(app: FastifyInstance) {
  const service = new FamilyService();

  app.get("/family/patient/:token/updates", async (req, reply) => {
    const { token } = req.params as { token: string };
    const updates = await service.getUpdates(token);
    return reply.send(updates);
  });

  app.get("/family/patient/:token/summary", async (req, reply) => {
    const { token } = req.params as { token: string };
    const summary = await service.getSummary(token);
    return reply.send(summary);
  });

  app.post("/family/patient/:token/messages", async (req, reply) => {
    const { token } = req.params as { token: string };
    const body = sendMessageSchema.parse(req.body);
    const message = await service.sendMessage(token, body.content);
    return reply.status(201).send(message);
  });
}
