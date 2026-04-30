// src/modules/admissions/admissions.schema.ts
import { z } from "zod";

export const createAdmissionSchema = z.object({
  patientId: z.string().cuid("ID do paciente inválido"),
  bedId: z.string().cuid("ID do leito inválido"),
  diagnosis: z.string().optional(),
});

export type CreateAdmissionInput = z.infer<typeof createAdmissionSchema>;
