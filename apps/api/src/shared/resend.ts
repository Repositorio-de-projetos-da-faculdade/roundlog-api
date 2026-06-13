// src/shared/resend.ts
// Cliente de e-mail com modo dry-run quando RESEND_API_KEY não está configurada.
// Em dry-run, e-mails são logados no console em vez de enviados.
import { Resend } from "resend";

let cached: Resend | null = null;

export const isResendEnabled = (): boolean => !!process.env.RESEND_API_KEY;

function getClient(): Resend {
  if (!cached) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY ausente");
    cached = new Resend(key);
  }
  return cached;
}

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

const DEFAULT_FROM = process.env.RESEND_FROM ?? "RoundLog <noreply@roundlog.dev>";

export async function sendEmail(payload: EmailPayload): Promise<{ id: string | null; dryRun: boolean }> {
  if (!isResendEnabled()) {
    // Dry-run: loga e retorna como se tivesse enviado
    console.log(
      `[email:dry-run] to=${JSON.stringify(payload.to)} subject="${payload.subject}"`,
    );
    if (process.env.LOG_LEVEL === "debug") {
      console.log(`[email:dry-run] body:\n${payload.html}`);
    }
    return { id: null, dryRun: true };
  }

  const result = await getClient().emails.send({
    from: payload.from ?? DEFAULT_FROM,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
  });

  return { id: result.data?.id ?? null, dryRun: false };
}

// --- Templates ---

export function overdueConductEmail(args: {
  patientName: string;
  bed: string;
  description: string;
  deadlineAt: Date;
}): { subject: string; html: string } {
  const deadline = args.deadlineAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return {
    subject: `[RoundLog] Conduta em atraso — leito ${args.bed}`,
    html: `
      <h2>Conduta em atraso</h2>
      <p><strong>Paciente:</strong> ${args.patientName}</p>
      <p><strong>Leito:</strong> ${args.bed}</p>
      <p><strong>Conduta:</strong> ${args.description}</p>
      <p><strong>Prazo:</strong> ${deadline}</p>
      <p>Acesse o RoundLog para registrar a execução.</p>
    `.trim(),
  };
}

export function criticalAlertEmail(args: {
  patientName: string;
  bed: string;
  alertDescription: string;
}): { subject: string; html: string } {
  return {
    subject: `[RoundLog] Alerta CRÍTICO — ${args.patientName}`,
    html: `
      <h2 style="color:#b91c1c">Alerta clínico crítico</h2>
      <p><strong>Paciente:</strong> ${args.patientName}</p>
      <p><strong>Leito:</strong> ${args.bed}</p>
      <p><strong>Detalhe:</strong> ${args.alertDescription}</p>
      <p>Ação imediata recomendada.</p>
    `.trim(),
  };
}

export function welcomeEmail(args: { name: string; email: string }): {
  subject: string;
  html: string;
} {
  return {
    subject: "Bem-vindo ao RoundLog",
    html: `
      <h2>Olá, ${args.name}!</h2>
      <p>Seu acesso ao RoundLog foi criado com sucesso.</p>
      <p><strong>E-mail:</strong> ${args.email}</p>
      <p>Boas visitas.</p>
    `.trim(),
  };
}
