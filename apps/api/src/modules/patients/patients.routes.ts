// src/modules/patients/patients.routes.ts
import { FastifyInstance } from "fastify";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { PatientsService } from "./patients.service.js";
import { createPatientSchema, listPatientsSchema } from "./patients.schema.js";

export async function patientsRoutes(app: FastifyInstance) {
  const service = new PatientsService();

  app.post("/patients", { preHandler: [authenticate] }, async (req, reply) => {
    const body = createPatientSchema.parse(req.body);
    const patient = await service.createPatient(body, req.user.hospitalId);
    return reply.status(201).send(patient);
  });

  app.get("/patients", { preHandler: [authenticate] }, async (req, reply) => {
    const query = listPatientsSchema.parse(req.query);
    const result = await service.listPatients(query, req.user.hospitalId);
    return reply.send(result);
  });

  app.get("/patients/:id", { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const patient = await service.getPatient(id, req.user.hospitalId);
    return reply.send(patient);
  });
}
