// src/modules/admissions/admissions.schema.ts
import { z } from "zod";

export const createAdmissionSchema = z.object({
  patientId: z.string().cuid("ID do paciente inválido"),
  bedId: z.string().cuid("ID do leito inválido"),
  diagnosis: z.string().max(500).optional(),
});

export const listAdmissionsSchema = z.object({
  status: z.enum(["ACTIVE", "DISCHARGED"]).optional(),
  wardId: z.string().cuid().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(20),
});

export const createFamilyContactSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(120),
  relationship: z.string().min(2, "Vínculo deve ter ao menos 2 caracteres").max(60),
  phone: z.string().min(8, "Telefone inválido").max(20),
});

export type CreateAdmissionInput = z.infer<typeof createAdmissionSchema>;
export type ListAdmissionsInput = z.infer<typeof listAdmissionsSchema>;
export type CreateFamilyContactInput = z.infer<typeof createFamilyContactSchema>;
