// src/modules/auth/auth.schema.ts
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(120),
  email: z.string().email("E-mail inválido").toLowerCase(),
  password: z.string().min(8, "Senha deve ter ao menos 8 caracteres").max(128),
  role: z.enum(["ADMIN", "PHYSICIAN", "NURSE", "TECHNICIAN", "MANAGER"]),
  hospitalId: z.string().cuid("ID do hospital inválido"),
  crm: z.string().max(20).optional(),
  coren: z.string().max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido").toLowerCase(),
  password: z.string().min(1, "Senha obrigatória").max(128),
});

// Refresh e logout agora usam cookie HttpOnly — schemas mantidos vazios
// para compatibilidade caso alguma rota legada precise validar body.
export const refreshSchema = z.object({}).strict();
export const logoutSchema = z.object({}).strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
