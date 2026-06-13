// src/modules/patients/patients.schema.ts
import { z } from "zod";

export const createPatientSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(120),
  dob: z.string().transform((val) => new Date(val)),
  cpf: z.string().min(11, "CPF inválido").max(14),
  bloodType: z.string().max(3).optional(),
  allergies: z.array(z.string()).default([]),
});

export const listPatientsSchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type ListPatientsInput = z.infer<typeof listPatientsSchema>;
