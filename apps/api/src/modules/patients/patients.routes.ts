// src/modules/patients/patients.routes.ts
import { FastifyInstance } from "fastify";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { PatientsService } from "./patients.service.js";
import { createPatientSchema } from "./patients.schema.js";

export async function patientsRoutes(app: FastifyInstance) {
  const service = new PatientsService();

  // POST /patients
  app.post("/patients", {
    preHandler: [authenticate],
  }, async (req, reply) => {
    const body = createPatientSchema.parse(req.body);
    const patient = await service.createPatient(body, req.user.hospitalId);
    return reply.status(201).send(patient);
  });

  // GET /patients/:id
  app.get("/patients/:id", {
    preHandler: [authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const patient = await service.getPatient(id, req.user.hospitalId);
    return reply.send(patient);
  });
}
