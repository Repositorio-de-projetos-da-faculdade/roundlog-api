// src/modules/family/family.schema.ts
import { z } from "zod";

export const sendMessageSchema = z.object({
  content: z.string().min(1, "Mensagem não pode ser vazia").max(2000),
});

// Token de acesso: 32-128 chars alfanuméricos (ou - _ para base64url).
// Bloqueia path-traversal, espaços e payloads suspeitos.
export const familyTokenSchema = z
  .string()
  .min(16, "Token inválido")
  .max(128, "Token inválido")
  .regex(/^[A-Za-z0-9_-]+$/, "Token inválido");

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
