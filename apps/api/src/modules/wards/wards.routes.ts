// src/modules/wards/wards.routes.ts
import { FastifyInstance } from "fastify";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { WardsService } from "./wards.service.js";
import { createWardSchema, createBedSchema } from "./wards.schema.js";

export async function wardsRoutes(app: FastifyInstance) {
  const service = new WardsService();

  // POST /wards
  app.post("/wards", {
    preHandler: [authenticate, authorize(["ADMIN", "MANAGER"])],
  }, async (req, reply) => {
    const body = createWardSchema.parse(req.body);
    const ward = await service.createWard(body, req.user.hospitalId);
    return reply.status(201).send(ward);
  });

  // GET /wards
  app.get("/wards", {
    preHandler: [authenticate],
  }, async (req, reply) => {
    const wards = await service.listWards(req.user.hospitalId);
    return reply.send(wards);
  });

  // POST /wards/:id/beds
  app.post("/wards/:id/beds", {
    preHandler: [authenticate, authorize(["ADMIN", "MANAGER"])],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = createBedSchema.parse(req.body);
    const bed = await service.createBed(id, body, req.user.hospitalId);
    return reply.status(201).send(bed);
  });

  // GET /wards/:id/beds
  app.get("/wards/:id/beds", {
    preHandler: [authenticate],
  }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const beds = await service.listBeds(id, req.user.hospitalId);
    return reply.send(beds);
  });
}
