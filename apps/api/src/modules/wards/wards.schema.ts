// src/modules/wards/wards.schema.ts
import { z } from "zod";

export const createWardSchema = z.object({
  name: z.string().min(1, "Nome da ala obrigatório"),
  floor: z.string().optional(),
  specialty: z.string().optional(),
});

export const createBedSchema = z.object({
  code: z.string().min(1, "Código do leito obrigatório"),
  status: z.enum(["AVAILABLE", "OCCUPIED", "MAINTENANCE"]).default("AVAILABLE"),
});

export type CreateWardInput = z.infer<typeof createWardSchema>;
export type CreateBedInput = z.infer<typeof createBedSchema>;
