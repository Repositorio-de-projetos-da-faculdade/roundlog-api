// src/modules/analytics/analytics.routes.ts
import { FastifyInstance } from "fastify";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { AnalyticsService } from "./analytics.service.js";

export async function analyticsRoutes(app: FastifyInstance) {
  const service = new AnalyticsService();

  app.get("/analytics/ward/:id", {
    preHandler: [authenticate, authorize(["MANAGER", "ADMIN"])],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const data = await service.getWardAnalytics(id, req.user.hospitalId);
    return reply.send(data);
  });

  app.get("/analytics/compliance", {
    preHandler: [authenticate, authorize(["MANAGER", "ADMIN"])],
  }, async (req, reply) => {
    const data = await service.getComplianceMetrics(req.user.hospitalId);
    return reply.send(data);
  });

  app.get("/analytics/handoffs", {
    preHandler: [authenticate, authorize(["MANAGER", "ADMIN"])],
  }, async (req, reply) => {
    const data = await service.getHandoffMetrics(req.user.hospitalId);
    return reply.send(data);
  });
}
