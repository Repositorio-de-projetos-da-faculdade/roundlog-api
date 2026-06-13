// src/modules/admissions/admissions.routes.ts
import { FastifyInstance } from "fastify";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { AdmissionsService } from "./admissions.service.js";
import {
  createAdmissionSchema,
  listAdmissionsSchema,
  createFamilyContactSchema,
} from "./admissions.schema.js";

export async function admissionsRoutes(app: FastifyInstance) {
  const service = new AdmissionsService();

  app.post(
    "/admissions",
    { preHandler: [authenticate, authorize(["PHYSICIAN", "ADMIN"])] },
    async (req, reply) => {
      const body = createAdmissionSchema.parse(req.body);
      const admission = await service.createAdmission(body, req.user.id, req.user.hospitalId);
      return reply.status(201).send(admission);
    },
  );

  app.get("/admissions", { preHandler: [authenticate] }, async (req, reply) => {
    const query = listAdmissionsSchema.parse(req.query);
    const result = await service.listAdmissions(query, req.user.hospitalId);
    return reply.send(result);
  });

  // Lista as internações relevantes pro usuário logado. PHYSICIAN/ADMIN/MANAGER
  // veem tudo do hospital; NURSE/TECHNICIAN veem só a ward do plantão aberto.
  // Usado pela tela inicial do PWA (/beds), substituindo o boot direto pro
  // gravador que ficava sem admissionId.
  app.get("/admissions/my", { preHandler: [authenticate] }, async (req, reply) => {
    const result = await service.listForUser(
      req.user.id,
      req.user.role,
      req.user.hospitalId,
    );
    return reply.send(result);
  });

  app.patch(
    "/admissions/:id/discharge",
    { preHandler: [authenticate, authorize(["PHYSICIAN", "ADMIN"])] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const admission = await service.discharge(id, req.user.hospitalId);
      return reply.send(admission);
    },
  );

  app.get("/admissions/:id", { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const admission = await service.getAdmission(id, req.user.hospitalId);
    return reply.send(admission);
  });

  app.post(
    "/admissions/:id/family-contacts",
    { preHandler: [authenticate] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const body = createFamilyContactSchema.parse(req.body);
      const contact = await service.addFamilyContact(id, body, req.user.hospitalId);
      return reply.status(201).send(contact);
    },
  );
}
