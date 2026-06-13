import { describe, expect, it } from "vitest";
import { dateRangeSchema } from "../../src/modules/analytics/analytics.schema.js";

describe("dateRangeSchema", () => {
  it("aceita ambos vazios", () => {
    expect(dateRangeSchema.parse({})).toEqual({});
  });

  it("aceita ISO com timezone", () => {
    const r = dateRangeSchema.parse({
      from: "2026-05-01T00:00:00.000Z",
      to: "2026-05-31T23:59:59.000Z",
    });
    expect(r.from).toBe("2026-05-01T00:00:00.000Z");
    expect(r.to).toBe("2026-05-31T23:59:59.000Z");
  });

  it("rejeita formato não-ISO", () => {
    expect(() => dateRangeSchema.parse({ from: "01/05/2026" })).toThrow();
    expect(() => dateRangeSchema.parse({ to: "2026-05-01" })).toThrow();
  });
});
