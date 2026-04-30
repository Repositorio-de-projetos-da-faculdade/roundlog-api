// src/modules/near-misses/near-misses.routes.ts
import { FastifyInstance } from "fastify";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { NearMissesService } from "./near-misses.service.js";
import { createNearMissSchema } from "./near-misses.schema.js";

export async function nearMissesRoutes(app: FastifyInstance) {
  const service = new NearMissesService();

  app.post("/near-misses", {
    preHandler: [authenticate],
  }, async (req, reply) => {
    const body = createNearMissSchema.parse(req.body);
    const nm = await service.create(body, req.user.hospitalId);
    return reply.status(201).send(nm);
  });

  app.get("/near-misses/summary", {
    preHandler: [authenticate, authorize(["MANAGER", "ADMIN"])],
  }, async (req, reply) => {
    const summary = await service.getSummary(req.user.hospitalId);
    return reply.send(summary);
  });

  app.get("/near-misses/patterns", {
    preHandler: [authenticate, authorize(["MANAGER", "ADMIN"])],
  }, async (req, reply) => {
    const patterns = await service.getPatterns(req.user.hospitalId);
    return reply.send(patterns);
  });
}
