// src/modules/shifts/shifts.routes.ts
import { FastifyInstance } from "fastify";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { authorize } from "../../shared/middleware/authorize.js";
import { ShiftsService } from "./shifts.service.js";
import { createShiftSchema, listShiftsSchema } from "./shifts.schema.js";

export async function shiftsRoutes(app: FastifyInstance) {
  const service = new ShiftsService();

  // GET /wards/:id/shifts
  app.get("/wards/:id/shifts", { preHandler: [authenticate] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const query = listShiftsSchema.parse(req.query);
    const shifts = await service.listByWard(id, req.user.hospitalId, query);
    return reply.send(shifts);
  });

  // POST /shifts
  app.post(
    "/shifts",
    { preHandler: [authenticate, authorize(["NURSE", "ADMIN"])] },
    async (req, reply) => {
      const body = createShiftSchema.parse(req.body);
      const shift = await service.create(body, req.user.id, req.user.hospitalId);
      return reply.status(201).send(shift);
    },
  );

  // PATCH /shifts/:id/close
  app.patch(
    "/shifts/:id/close",
    { preHandler: [authenticate, authorize(["NURSE", "ADMIN"])] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const shift = await service.close(id, req.user.hospitalId);
      return reply.send(shift);
    },
  );
}
