// src/modules/hospitals/hospitals.routes.ts
import { FastifyInstance } from "fastify";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { HospitalsService } from "./hospitals.service.js";

export async function hospitalsRoutes(app: FastifyInstance) {
  const service = new HospitalsService();

  // GET /hospital
  app.get("/hospital", {
    preHandler: [authenticate],
  }, async (req, reply) => {
    const hospital = await service.getHospital(req.user.hospitalId);
    return reply.send(hospital);
  });
}
