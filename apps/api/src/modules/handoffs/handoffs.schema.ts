// src/modules/handoffs/handoffs.schema.ts
import { z } from "zod";

export const generateHandoffSchema = z.object({
  wardId: z.string().cuid("ID da ala inválido"),
  fromShiftId: z.string().cuid("ID do turno de origem inválido"),
});

export type GenerateHandoffInput = z.infer<typeof generateHandoffSchema>;
