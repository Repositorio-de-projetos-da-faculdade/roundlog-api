// src/modules/patients/patients.schema.ts
import { z } from "zod";

export const createPatientSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  dob: z.string().transform((val) => new Date(val)),
  cpf: z.string().min(11, "CPF inválido"),
  bloodType: z.string().optional(),
  allergies: z.array(z.string()).default([]),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
