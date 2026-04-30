// src/modules/analytics/analytics.schema.ts
import { z } from "zod";

export const wardAnalyticsParams = z.object({
  id: z.string().cuid("ID da ala inválido"),
});
