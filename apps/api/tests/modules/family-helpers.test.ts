import { describe, expect, it } from "vitest";
import {
  calcAge,
  calcDaysAdmitted,
  buildTimeline,
} from "../../src/modules/family/family.helpers.js";

describe("calcAge", () => {
  it("calcula anos completos", () => {
    const now = new Date("2026-05-31T12:00:00Z");
    expect(calcAge(new Date("2000-01-01T00:00:00Z"), now)).toBe(26);
  });

  it("desconta aniversário ainda não ocorrido no ano", () => {
    const now = new Date("2026-05-31T12:00:00Z");
    expect(calcAge(new Date("2000-12-31T00:00:00Z"), now)).toBe(25);
  });

  it("nunca retorna negativo", () => {
    const now = new Date("2026-05-31T12:00:00Z");
    expect(calcAge(new Date("2027-01-01T00:00:00Z"), now)).toBe(0);
  });
});

describe("calcDaysAdmitted", () => {
  it("conta o dia da admissão como 1", () => {
    const now = new Date("2026-05-31T12:00:00Z");
    expect(calcDaysAdmitted(new Date("2026-05-31T08:00:00Z"), null, now)).toBe(1);
  });

  it("conta intervalo até hoje quando não há alta", () => {
    const now = new Date("2026-05-31T12:00:00Z");
    expect(calcDaysAdmitted(new Date("2026-05-25T12:00:00Z"), null, now)).toBe(7);
  });

  it("usa dischargedAt quando há alta", () => {
    const now = new Date("2026-05-31T12:00:00Z");
    const admitted = new Date("2026-05-20T12:00:00Z");
    const discharged = new Date("2026-05-23T12:00:00Z");
    expect(calcDaysAdmitted(admitted, discharged, now)).toBe(4);
  });
});

describe("buildTimeline", () => {
  // Datas construídas em horário local para o agrupamento por dia ser
  // independente do timezone do runner.
  const now = new Date(2026, 4, 31, 12, 0, 0);

  it("retorna uma entrada por dia preenchendo zeros", () => {
    const tl = buildTimeline([], [], now, 14);
    expect(tl).toHaveLength(14);
    expect(tl.every((e) => e.visits === 0 && e.updates === 0)).toBe(true);
    // última entrada é hoje
    expect(tl[tl.length - 1].date).toBe("2026-05-31");
  });

  it("agrupa visitas e atualizações por dia", () => {
    const today = new Date(2026, 4, 31, 9, 0, 0);
    const today2 = new Date(2026, 4, 31, 18, 0, 0);
    const tl = buildTimeline([today, today2], [today], now, 14);
    const last = tl[tl.length - 1];
    expect(last.visits).toBe(2);
    expect(last.updates).toBe(1);
  });

  it("ignora datas fora da janela mas não quebra", () => {
    const old = new Date(2026, 0, 1, 12, 0, 0);
    const tl = buildTimeline([old], [], now, 14);
    expect(tl).toHaveLength(14);
    expect(tl.reduce((s, e) => s + e.visits, 0)).toBe(0);
  });
});
