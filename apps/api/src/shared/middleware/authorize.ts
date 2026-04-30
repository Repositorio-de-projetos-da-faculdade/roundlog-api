// src/shared/middleware/authorize.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { Role } from "@prisma/client";

export function authorize(roles: Role[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const userRole = req.user?.role as Role;
    if (!userRole || !roles.includes(userRole)) {
      return reply.status(403).send({ error: "Sem permissão para esta ação" });
    }
  };
}
