// src/modules/auth/auth.routes.ts
import { FastifyInstance, FastifyReply } from "fastify";
import { AuthService } from "./auth.service.js";
import { registerSchema, loginSchema } from "./auth.schema.js";
import {
  consumeRefreshJti,
  newJti,
  registerRefreshJti,
  revokeRefreshJti,
  REFRESH_EXPIRES_SECONDS,
} from "../../shared/tokens.js";
import { sendEmail, welcomeEmail } from "../../shared/resend.js";
import type { JWTPayload } from "../../shared/middleware/authenticate.js";

type AccessPayload = JWTPayload;

interface RefreshPayload {
  id: string;
  jti: string;
  type: "refresh";
}

const REFRESH_COOKIE = "rl_rt";

// Cookie options para o refresh token. SameSite=Lax funciona pra mesma família
// de site (localhost:3000 ↔ localhost:3001 são same-site). Em prod usar
// SameSite=None + Secure se a API estiver em domínio diferente do front.
function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/auth",
    maxAge: REFRESH_EXPIRES_SECONDS,
  };
}

function setRefreshCookie(reply: FastifyReply, refreshToken: string) {
  reply.setCookie(REFRESH_COOKIE, refreshToken, cookieOptions());
}

function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_COOKIE, { path: "/auth" });
}

export async function authRoutes(app: FastifyInstance) {
  const service = new AuthService();

  async function issueTokensFor(user: AccessPayload) {
    const accessToken = app.jwt.sign(user, { expiresIn: "1d" });

    const jti = newJti();
    await registerRefreshJti(jti, user.id);
    const refreshToken = app.jwt.sign(
      { id: user.id, jti, type: "refresh" } as unknown as JWTPayload,
      { expiresIn: REFRESH_EXPIRES_SECONDS },
    );
    return { accessToken, refreshToken };
  }

  // POST /auth/register
  app.post(
    "/register",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const body = registerSchema.parse(req.body);
      const user = await service.register(body);
      void sendEmail({ to: user.email, ...welcomeEmail({ name: user.name, email: user.email }) }).catch(
        (err) => req.log.warn({ err: err.message }, "Falha ao enviar welcome e-mail"),
      );
      return reply.status(201).send(user);
    },
  );

  // POST /auth/login — seta refresh em cookie HttpOnly, retorna só access no body
  app.post(
    "/login",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const body = loginSchema.parse(req.body);
      const user = await service.login(body);

      const { accessToken, refreshToken } = await issueTokensFor({
        id: user.id,
        email: user.email,
        role: user.role,
        hospitalId: user.hospitalId,
      });

      setRefreshCookie(reply, refreshToken);

      return reply.send({
        user,
        token: accessToken,
      });
    },
  );

  // POST /auth/refresh — lê cookie HttpOnly, rotaciona, atualiza cookie
  app.post(
    "/refresh",
    { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const cookieToken = req.cookies?.[REFRESH_COOKIE];
      if (!cookieToken) {
        return reply.status(401).send({ error: "Refresh token ausente" });
      }

      let payload: RefreshPayload;
      try {
        payload = app.jwt.verify<RefreshPayload>(cookieToken);
      } catch {
        clearRefreshCookie(reply);
        return reply.status(401).send({ error: "Refresh token inválido" });
      }

      if (payload.type !== "refresh" || !payload.jti) {
        clearRefreshCookie(reply);
        return reply.status(401).send({ error: "Refresh token inválido" });
      }

      const record = await consumeRefreshJti(payload.jti);
      if (!record || record.userId !== payload.id) {
        clearRefreshCookie(reply);
        return reply.status(401).send({ error: "Refresh token expirado ou revogado" });
      }

      const user = await service.findById(payload.id);
      if (!user) {
        clearRefreshCookie(reply);
        return reply.status(401).send({ error: "Usuário não encontrado" });
      }

      const tokens = await issueTokensFor({
        id: user.id,
        email: user.email,
        role: user.role,
        hospitalId: user.hospitalId,
      });

      setRefreshCookie(reply, tokens.refreshToken);
      return reply.send({ token: tokens.accessToken });
    },
  );

  // POST /auth/logout — revoga jti + limpa cookie (idempotente)
  app.post("/logout", async (req, reply) => {
    const cookieToken = req.cookies?.[REFRESH_COOKIE];
    if (cookieToken) {
      try {
        const payload = app.jwt.verify<RefreshPayload>(cookieToken);
        if (payload.type === "refresh" && payload.jti) {
          await revokeRefreshJti(payload.jti);
        }
      } catch {
        // token expirado/inválido — segue limpando cookie
      }
    }
    clearRefreshCookie(reply);
    return reply.send({ message: "Logout realizado com sucesso" });
  });
}
