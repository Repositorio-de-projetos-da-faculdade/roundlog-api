import { describe, expect, it } from "vitest";
import {
  createShiftSchema,
  listShiftsSchema,
} from "../../src/modules/shifts/shifts.schema.js";

const VALID_CUID = "clxward000000000000000000000";

describe("createShiftSchema", () => {
  it("aceita type MORNING/AFTERNOON/NIGHT", () => {
    expect(createShiftSchema.parse({ wardId: VALID_CUID, type: "MORNING" }).type).toBe(
      "MORNING",
    );
    expect(createShiftSchema.parse({ wardId: VALID_CUID, type: "AFTERNOON" }).type).toBe(
      "AFTERNOON",
    );
    expect(createShiftSchema.parse({ wardId: VALID_CUID, type: "NIGHT" }).type).toBe(
      "NIGHT",
    );
  });

  it("rejeita type inválido", () => {
    expect(() => createShiftSchema.parse({ wardId: VALID_CUID, type: "morning" })).toThrow();
    expect(() => createShiftSchema.parse({ wardId: VALID_CUID, type: "DAWN" })).toThrow();
  });

  it("rejeita wardId não-cuid", () => {
    expect(() => createShiftSchema.parse({ wardId: "not-cuid", type: "MORNING" })).toThrow();
  });
});

describe("listShiftsSchema", () => {
  it("aceita vazio (open undefined)", () => {
    expect(listShiftsSchema.parse({}).open).toBeUndefined();
  });

  it("coage open de string para boolean", () => {
    expect(listShiftsSchema.parse({ open: "true" }).open).toBe(true);
    // z.coerce.boolean: qualquer string não-vazia é true
    expect(listShiftsSchema.parse({ open: "false" }).open).toBe(true);
    expect(listShiftsSchema.parse({ open: "" }).open).toBe(false);
  });
});
