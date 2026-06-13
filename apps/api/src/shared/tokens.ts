// src/shared/tokens.ts
// Refresh tokens com rotação obrigatória e revogação via Redis.
// Cada refresh token tem um `jti` único guardado em Redis com TTL.
// Logout / refresh exitoso → jti é apagado, token vira inválido.
import { randomUUID } from "node:crypto";
import { redisConnection } from "./queue.js";

const REFRESH_TTL_SECONDS = 7 * 24 * 3600; // 7 dias
const REFRESH_KEY_PREFIX = "refresh:";

export interface RefreshTokenRecord {
  userId: string;
  issuedAt: number;
}

export async function registerRefreshJti(jti: string, userId: string): Promise<void> {
  const record: RefreshTokenRecord = { userId, issuedAt: Date.now() };
  await redisConnection.set(
    `${REFRESH_KEY_PREFIX}${jti}`,
    JSON.stringify(record),
    "EX",
    REFRESH_TTL_SECONDS,
  );
}

export async function consumeRefreshJti(jti: string): Promise<RefreshTokenRecord | null> {
  const key = `${REFRESH_KEY_PREFIX}${jti}`;
  const raw = await redisConnection.get(key);
  if (!raw) return null;

  // Atômico: deleta na mesma operação para garantir uso único (rotação)
  const deleted = await redisConnection.del(key);
  if (deleted === 0) return null; // já consumido por requisição concorrente

  try {
    return JSON.parse(raw) as RefreshTokenRecord;
  } catch {
    return null;
  }
}

export async function revokeRefreshJti(jti: string): Promise<void> {
  await redisConnection.del(`${REFRESH_KEY_PREFIX}${jti}`);
}

export function newJti(): string {
  return randomUUID();
}

export const REFRESH_EXPIRES_SECONDS = REFRESH_TTL_SECONDS;
