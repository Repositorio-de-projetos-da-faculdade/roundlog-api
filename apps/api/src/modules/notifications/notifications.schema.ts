// src/modules/notifications/notifications.schema.ts
import { z } from "zod";

export const subscribeSchema = z.object({
  endpoint: z.string().url("Endpoint inválido").max(2048),
  keys: z.object({
    p256dh: z.string().min(1).max(512),
    auth: z.string().min(1).max(256),
  }),
  userAgent: z.string().max(512).optional(),
});

export const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
});

export const listNotificationsSchema = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(20),
});

export type SubscribeInput = z.infer<typeof subscribeSchema>;
export type UnsubscribeInput = z.infer<typeof unsubscribeSchema>;
export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;
