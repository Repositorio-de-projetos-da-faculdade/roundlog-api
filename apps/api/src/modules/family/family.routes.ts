// src/modules/family/family.routes.ts
import { FastifyInstance } from "fastify";
import { FamilyService } from "./family.service.js";
import { sendMessageSchema, familyTokenSchema } from "./family.schema.js";

export async function familyRoutes(app: FastifyInstance) {
  const service = new FamilyService();

  app.get("/family/patient/:token/updates", async (req, reply) => {
    const { token: rawToken } = req.params as { token: string };
    const token = familyTokenSchema.parse(rawToken);
    const updates = await service.getUpdates(token);
    return reply.send(updates);
  });

  app.get("/family/patient/:token/summary", async (req, reply) => {
    const { token: rawToken } = req.params as { token: string };
    const token = familyTokenSchema.parse(rawToken);
    const summary = await service.getSummary(token);
    return reply.send(summary);
  });

  app.get("/family/patient/:token/overview", async (req, reply) => {
    const { token: rawToken } = req.params as { token: string };
    const token = familyTokenSchema.parse(rawToken);
    const overview = await service.getOverview(token);
    return reply.send(overview);
  });

  app.post("/family/patient/:token/messages", async (req, reply) => {
    const { token: rawToken } = req.params as { token: string };
    const token = familyTokenSchema.parse(rawToken);
    const body = sendMessageSchema.parse(req.body);
    const message = await service.sendMessage(token, body.content);
    return reply.status(201).send(message);
  });
}
