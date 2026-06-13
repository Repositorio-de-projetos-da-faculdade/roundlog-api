import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  criticalAlertEmail,
  isResendEnabled,
  overdueConductEmail,
  sendEmail,
  welcomeEmail,
} from "../../src/shared/resend.js";

describe("isResendEnabled", () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it("retorna false sem RESEND_API_KEY", () => {
    expect(isResendEnabled()).toBe(false);
  });

  it("retorna true com RESEND_API_KEY", () => {
    process.env.RESEND_API_KEY = "re_test";
    expect(isResendEnabled()).toBe(true);
    delete process.env.RESEND_API_KEY;
  });
});

describe("sendEmail dry-run", () => {
  beforeEach(() => {
    delete process.env.RESEND_API_KEY;
  });

  it("retorna dryRun=true sem chave configurada", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await sendEmail({
      to: "dev@roundlog.dev",
      subject: "Teste",
      html: "<p>oi</p>",
    });
    expect(result.dryRun).toBe(true);
    expect(result.id).toBe(null);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});

describe("templates", () => {
  it("overdueConductEmail formata data e inclui dados do paciente", () => {
    const out = overdueConductEmail({
      patientName: "João",
      bed: "L01",
      description: "Antibiótico EV",
      deadlineAt: new Date("2026-01-01T12:00:00Z"),
    });
    expect(out.subject).toContain("L01");
    expect(out.html).toContain("João");
    expect(out.html).toContain("Antibiótico EV");
  });

  it("criticalAlertEmail destaca paciente e alerta", () => {
    const out = criticalAlertEmail({
      patientName: "Maria",
      bed: "L02",
      alertDescription: "Alergia a penicilina",
    });
    expect(out.subject).toContain("CRÍTICO");
    expect(out.html).toContain("Maria");
    expect(out.html).toContain("Alergia");
  });

  it("welcomeEmail inclui nome e e-mail", () => {
    const out = welcomeEmail({ name: "Ana", email: "ana@hospital.com" });
    expect(out.html).toContain("Ana");
    expect(out.html).toContain("ana@hospital.com");
  });
});
