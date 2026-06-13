// src/modules/notifications/notifications.routes.ts
import { FastifyInstance } from "fastify";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { NotificationsService } from "./notifications.service.js";
import {
  subscribeSchema,
  unsubscribeSchema,
  listNotificationsSchema,
} from "./notifications.schema.js";
import { VAPID_PUBLIC_KEY, isPushEnabled } from "../../shared/push.js";

export async function notificationsRoutes(app: FastifyInstance) {
  const service = new NotificationsService();

  // --- Push (VAPID) ---

  app.get("/notifications/public-key", async (_req, reply) => {
    return reply.send({
      publicKey: VAPID_PUBLIC_KEY || null,
      enabled: isPushEnabled(),
    });
  });

  app.post(
    "/notifications/subscribe",
    { preHandler: [authenticate] },
    async (req, reply) => {
      const body = subscribeSchema.parse(req.body);
      const sub = await service.subscribe(req.user.id, body);
      return reply.status(201).send({ id: sub.id });
    },
  );

  app.delete(
    "/notifications/subscribe",
    { preHandler: [authenticate] },
    async (req, reply) => {
      const body = unsubscribeSchema.parse(req.body);
      await service.unsubscribe(req.user.id, body.endpoint);
      return reply.status(204).send();
    },
  );

  app.get(
    "/notifications/subscriptions",
    { preHandler: [authenticate] },
    async (req, reply) => {
      const subs = await service.listSubscriptions(req.user.id);
      return reply.send(subs);
    },
  );

  // --- Histórico in-app ---

  app.get("/notifications", { preHandler: [authenticate] }, async (req, reply) => {
    const query = listNotificationsSchema.parse(req.query);
    const result = await service.list(req.user.id, query);
    return reply.send(result);
  });

  app.patch(
    "/notifications/:id/read",
    { preHandler: [authenticate] },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const updated = await service.markRead(req.user.id, id);
      return reply.send(updated);
    },
  );

  app.post(
    "/notifications/read-all",
    { preHandler: [authenticate] },
    async (req, reply) => {
      const result = await service.markAllRead(req.user.id);
      return reply.send(result);
    },
  );
}
