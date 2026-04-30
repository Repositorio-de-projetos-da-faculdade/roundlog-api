// src/modules/auth/auth.routes.ts
import { FastifyInstance } from "fastify";
import { AuthService } from "./auth.service.js";
import { registerSchema, loginSchema } from "./auth.schema.js";

export async function authRoutes(app: FastifyInstance) {
  const service = new AuthService();

  // POST /auth/register
  app.post("/register", async (req, reply) => {
    const body = registerSchema.parse(req.body);
    const user = await service.register(body);
    return reply.status(201).send(user);
  });

  // POST /auth/login
  app.post("/login", async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const user = await service.login(body);

    const token = app.jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        hospitalId: user.hospitalId,
      },
      { expiresIn: "1d" }
    );

    const refreshToken = app.jwt.sign(
      { id: user.id },
      { expiresIn: "7d" }
    );

    return reply.send({
      user,
      token,
      refreshToken,
    });
  });

  // POST /auth/refresh
  app.post("/refresh", async (req, reply) => {
    const { refreshToken } = req.body as { refreshToken: string };

    try {
      const payload = app.jwt.verify<{ id: string }>(refreshToken);
      const newToken = app.jwt.sign(
        { id: payload.id },
        { expiresIn: "1d" }
      );
      return reply.send({ token: newToken });
    } catch {
      return reply.status(401).send({ error: "Refresh token inválido" });
    }
  });

  // POST /auth/logout (client-side — apenas confirma)
  app.post("/logout", async (_req, reply) => {
    return reply.send({ message: "Logout realizado com sucesso" });
  });
}
