// src/modules/analytics/analytics.schema.ts
import { z } from "zod";

export const wardAnalyticsParams = z.object({
  id: z.string().cuid("ID da ala inválido"),
});

/**
 * Filtros temporais — `from` e `to` em ISO datetime.
 * Quando ausentes, services usam um default (últimos 30 dias).
 */
export const dateRangeSchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export type DateRangeInput = z.infer<typeof dateRangeSchema>;
