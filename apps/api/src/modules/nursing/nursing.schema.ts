// src/modules/nursing/nursing.schema.ts
import { z } from "zod";

export const executeConductSchema = z.object({
  shiftId: z.string().cuid("ID do turno inválido"),
  notes: z.string().optional(),
  status: z.enum(["done", "partial", "not_possible"]).default("done"),
});

export type ExecuteConductInput = z.infer<typeof executeConductSchema>;
