// src/modules/shifts/shifts.schema.ts
import { z } from "zod";

export const createShiftSchema = z.object({
  wardId: z.string().cuid(),
  type: z.enum(["MORNING", "AFTERNOON", "NIGHT"]),
});

export const listShiftsSchema = z.object({
  open: z.coerce.boolean().optional(), // true = só turnos sem endedAt
});

export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type ListShiftsInput = z.infer<typeof listShiftsSchema>;
