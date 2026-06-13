import { describe, expect, it } from "vitest";
import {
  createPatientSchema,
  listPatientsSchema,
} from "../../src/modules/patients/patients.schema.js";

describe("createPatientSchema", () => {
  it("aceita payload válido e converte dob em Date", () => {
    const r = createPatientSchema.parse({
      name: "Ana",
      dob: "1990-05-12",
      cpf: "12345678901",
      allergies: ["dipirona"],
    });
    expect(r.dob).toBeInstanceOf(Date);
    expect(r.allergies).toEqual(["dipirona"]);
  });

  it("aplica default vazio em allergies", () => {
    const r = createPatientSchema.parse({
      name: "Ana",
      dob: "1990-05-12",
      cpf: "12345678901",
    });
    expect(r.allergies).toEqual([]);
  });

  it("rejeita nome curto e CPF curto", () => {
    expect(() =>
      createPatientSchema.parse({ name: "A", dob: "1990", cpf: "123" }),
    ).toThrow();
  });
});

describe("listPatientsSchema", () => {
  it("aplica defaults skip=0 take=20", () => {
    const r = listPatientsSchema.parse({});
    expect(r.skip).toBe(0);
    expect(r.take).toBe(20);
    expect(r.search).toBeUndefined();
  });

  it("coage números via query string", () => {
    const r = listPatientsSchema.parse({ skip: "10", take: "5" });
    expect(r.skip).toBe(10);
    expect(r.take).toBe(5);
  });

  it("limita take a 100", () => {
    expect(() => listPatientsSchema.parse({ take: "500" })).toThrow();
  });

  it("rejeita skip negativo", () => {
    expect(() => listPatientsSchema.parse({ skip: "-1" })).toThrow();
  });
});
