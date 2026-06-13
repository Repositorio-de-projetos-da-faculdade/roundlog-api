// src/modules/notifications/notifications.service.ts
import { prisma } from "../../shared/prisma.js";
import { NotFoundError } from "../../shared/errors.js";
import type { ListNotificationsInput, SubscribeInput } from "./notifications.schema.js";

export class NotificationsService {
  async subscribe(userId: string, data: SubscribeInput) {
    return prisma.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: {
        userId,
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        userAgent: data.userAgent,
      },
      update: {
        userId,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        userAgent: data.userAgent,
      },
    });
  }

  async unsubscribe(userId: string, endpoint: string) {
    return prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
  }

  async listSubscriptions(userId: string) {
    return prisma.pushSubscription.findMany({
      where: { userId },
      select: { id: true, endpoint: true, userAgent: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Histórico in-app: notificações persistidas pra revisitar mesmo depois
   * que o push some do SO. Suporta filtro `unreadOnly` e paginação.
   */
  async list(userId: string, filters: ListNotificationsInput) {
    const where = {
      userId,
      ...(filters.unreadOnly ? { readAt: null } : {}),
    };

    const [total, items, unreadCount] = await prisma.$transaction([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return { total, unreadCount, skip: filters.skip, take: filters.take, items };
  }

  async markRead(userId: string, id: string) {
    const notif = await prisma.notification.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!notif) throw new NotFoundError("Notificação");

    return prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    const result = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }
}
