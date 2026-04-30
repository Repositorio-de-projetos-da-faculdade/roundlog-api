// src/modules/admissions/admissions.routes.ts
import { FastifyInstance } from "fastify";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { AdmissionsService } from "./admissions.service.js";
import { createAdmissionSchema } from "./admissions.schema.js";

export async function admissionsRoutes(app: FastifyInstance) {
  const service = new AdmissionsService();

  // POST /admissions
  app.post("/admissions", {
    preHandler: [authenticate, authorize(["PHYSICIAN", "ADMIN"])],
  }, async (req, reply) => {
    const body = createAdmissionSchema.parse(req.body);
    const admission = await service.createAdmission(body, req.user.id);
    return reply.status(201).send(admission);
  });

  // PATCH /admissions/:id/discharge
  app.patch("/admissions/:id/discharge", {
    preHandler: [authenticate, authorize(["PHYSICIAN", "ADMIN"])],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const admission = await service.discharge(id);
    return reply.send(admission);
  });

  // GET /admissions/:id
  app.get("/admissions/:id", {
    preHandler: [authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const admission = await service.getAdmission(id);
    return reply.send(admission);
  });
}
