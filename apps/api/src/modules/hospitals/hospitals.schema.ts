// src/modules/hospitals/hospitals.schema.ts
import { z } from "zod";

export const createHospitalSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  cnpj: z.string().min(14, "CNPJ inválido"),
});

export type CreateHospitalInput = z.infer<typeof createHospitalSchema>;
