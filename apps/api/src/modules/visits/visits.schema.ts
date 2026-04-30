// src/modules/visits/visits.schema.ts
import { z } from "zod";

export const createVisitSchema = z.object({
  admissionId: z.string().cuid("ID da internação inválido"),
});

export type CreateVisitInput = z.infer<typeof createVisitSchema>;
