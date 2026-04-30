// src/modules/near-misses/near-misses.schema.ts
import { z } from "zod";

export const createNearMissSchema = z.object({
  wardId: z.string().optional(),
  category: z.enum(["medication", "procedure", "communication", "equipment", "fall"]),
  severity: z.enum(["near_miss", "no_harm", "harm"]),
  description: z.string().min(10, "Descrição deve ter ao menos 10 caracteres"),
  isAnonymous: z.boolean().default(true),
});

export type CreateNearMissInput = z.infer<typeof createNearMissSchema>;
