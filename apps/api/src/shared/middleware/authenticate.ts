// src/shared/middleware/authenticate.ts
import { FastifyRequest, FastifyReply } from "fastify";

export interface JWTPayload {
  id: string;
  email: string;
  role: string;
  hospitalId: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user: JWTPayload;
  }
}

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify();
  } catch {
    return reply.status(401).send({ error: "Token obrigatório ou inválido" });
  }
}
