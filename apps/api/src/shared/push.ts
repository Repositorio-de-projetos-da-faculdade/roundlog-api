// src/shared/push.ts
// Cliente web-push com fallback dry-run quando VAPID keys ausentes.
// Em dev sem chaves: loga no console. Em prod: envia via FCM/APN/Mozilla.
import webpush from "web-push";
import { prisma } from "./prisma.js";

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:noreply@roundlog.dev";

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  configured = true;
  return true;
}

export const isPushEnabled = (): boolean => !!(VAPID_PUBLIC && VAPID_PRIVATE);

export interface PushPayload {
  title: string;
  body: string;
  /** URL relativa para abrir ao clicar (ex: `/visits/abc`). */
  url?: string;
  /** Tag para deduplicar notificações no SO. */
  tag?: string;
}

/**
 * Envia push para uma única subscription. Se retornar 404/410, remove
 * a subscription do banco (cliente desinstalou ou revogou).
 */
async function sendOne(
  sub: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
): Promise<boolean> {
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
    );
    return true;
  } catch (err: unknown) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 404 || status === 410) {
      // Subscription morta — remove do banco
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
    } else {
      console.error(`[push] Falha enviar para ${sub.endpoint.slice(0, 40)}...:`, err);
    }
    return false;
  }
}

/** Envia push para todas as subscriptions de um usuário. */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!ensureConfigured()) {
    console.log(`[push:dry-run] user=${userId} title="${payload.title}" body="${payload.body}"`);
    return 0;
  }

  const subs = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  if (subs.length === 0) return 0;

  const results = await Promise.all(subs.map((s) => sendOne(s, payload)));
  return results.filter(Boolean).length;
}

/** Envia push para todos os usuários listados (broadcast por papel/hospital). */
export async function sendPushToUsers(userIds: string[], payload: PushPayload): Promise<number> {
  if (userIds.length === 0) return 0;
  const totals = await Promise.all(userIds.map((id) => sendPushToUser(id, payload)));
  return totals.reduce((a, b) => a + b, 0);
}

export const VAPID_PUBLIC_KEY = VAPID_PUBLIC;
