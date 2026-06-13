import { describe, expect, it } from "vitest";
import {
  createAdmissionSchema,
  listAdmissionsSchema,
} from "../../src/modules/admissions/admissions.schema.js";

describe("listAdmissionsSchema", () => {
  it("aceita só defaults", () => {
    const r = listAdmissionsSchema.parse({});
    expect(r.skip).toBe(0);
    expect(r.take).toBe(20);
    expect(r.status).toBeUndefined();
    expect(r.wardId).toBeUndefined();
  });

  it("aceita filtro de status ACTIVE/DISCHARGED", () => {
    expect(listAdmissionsSchema.parse({ status: "ACTIVE" }).status).toBe("ACTIVE");
    expect(listAdmissionsSchema.parse({ status: "DISCHARGED" }).status).toBe("DISCHARGED");
  });

  it("rejeita status inválido", () => {
    expect(() => listAdmissionsSchema.parse({ status: "active" })).toThrow();
  });

  it("valida wardId como cuid", () => {
    expect(() => listAdmissionsSchema.parse({ wardId: "not-cuid" })).toThrow();
  });
});

describe("createAdmissionSchema", () => {
  it("limita diagnosis a 500 chars", () => {
    expect(() =>
      createAdmissionSchema.parse({
        patientId: "clxpatient00000000000000000",
        bedId: "clxbed00000000000000000000",
        diagnosis: "x".repeat(501),
      }),
    ).toThrow();
  });
});
