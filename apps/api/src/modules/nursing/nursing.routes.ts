// src/modules/nursing/nursing.routes.ts
import { FastifyInstance } from "fastify";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { NursingService } from "./nursing.service.js";
import { executeConductSchema } from "./nursing.schema.js";

export async function nursingRoutes(app: FastifyInstance) {
  const service = new NursingService();

  // GET /wards/:id/dashboard — todos os leitos com status atual
  app.get("/wards/:id/dashboard", {
    preHandler: [authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const dashboard = await service.getWardDashboard(id, req.user.hospitalId);
    return reply.send(dashboard);
  });

  // POST /conducts/:id/execute — registro de execução pela enfermagem
  app.post("/conducts/:id/execute", {
    preHandler: [authenticate, authorize(["NURSE", "TECHNICIAN"])],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = executeConductSchema.parse(req.body);
    const execution = await service.executeConduct(id, body, req.user.id);
    return reply.status(201).send(execution);
  });

  // GET /nursing/overdue — condutas em atraso
  app.get("/nursing/overdue", {
    preHandler: [authenticate],
  }, async (req, reply) => {
    const overdue = await service.getOverdueConducts(req.user.hospitalId);
    return reply.send(overdue);
  });
}
