// src/modules/family/family.schema.ts
import { z } from "zod";

export const sendMessageSchema = z.object({
  content: z.string().min(1, "Mensagem não pode ser vazia"),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
