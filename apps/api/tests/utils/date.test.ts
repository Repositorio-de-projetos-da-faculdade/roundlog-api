import { describe, expect, it } from "vitest";
import { addHours, isOverdue } from "../../src/shared/utils/date.js";

describe("isOverdue", () => {
  it("retorna true para datas no passado", () => {
    expect(isOverdue(new Date(Date.now() - 1000))).toBe(true);
  });

  it("retorna false para datas no futuro", () => {
    expect(isOverdue(new Date(Date.now() + 60_000))).toBe(false);
  });
});

describe("addHours", () => {
  it("soma horas mantendo precisão de minutos", () => {
    const base = new Date("2026-01-01T10:00:00Z");
    const plus3 = addHours(base, 3);
    expect(plus3.toISOString()).toBe("2026-01-01T13:00:00.000Z");
  });

  it("aceita valores negativos", () => {
    const base = new Date("2026-01-01T10:00:00Z");
    const minus1 = addHours(base, -1);
    expect(minus1.toISOString()).toBe("2026-01-01T09:00:00.000Z");
  });
});
