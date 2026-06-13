import { describe, expect, it } from "vitest";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} from "../../src/modules/auth/auth.schema.js";
import { familyTokenSchema } from "../../src/modules/family/family.schema.js";

describe("registerSchema", () => {
  it("normaliza e-mail para minúsculas", () => {
    const r = registerSchema.parse({
      name: "Ana",
      email: "ANA@HOSPITAL.COM",
      password: "senhaforte",
      role: "PHYSICIAN",
      hospitalId: "clxhospital0000000000000000",
    });
    expect(r.email).toBe("ana@hospital.com");
  });

  it("rejeita senha curta", () => {
    expect(() =>
      registerSchema.parse({
        name: "A",
        email: "a@b.com",
        password: "12345",
        role: "ADMIN",
        hospitalId: "clxhospital0000000000000000",
      }),
    ).toThrow();
  });

  it("rejeita role inválido", () => {
    expect(() =>
      registerSchema.parse({
        name: "Ana",
        email: "ana@b.com",
        password: "senhaforte",
        role: "ROOT" as never,
        hospitalId: "clxhospital0000000000000000",
      }),
    ).toThrow();
  });
});

describe("loginSchema", () => {
  it("normaliza e-mail", () => {
    const r = loginSchema.parse({ email: "X@Y.COM", password: "abc" });
    expect(r.email).toBe("x@y.com");
  });
});

describe("refreshSchema e logoutSchema", () => {
  it("rejeitam refreshToken vazio", () => {
    expect(() => refreshSchema.parse({ refreshToken: "" })).toThrow();
    expect(() => logoutSchema.parse({ refreshToken: "" })).toThrow();
  });
});

describe("familyTokenSchema", () => {
  it("aceita token alfanumérico longo", () => {
    expect(() => familyTokenSchema.parse("abc123_ABC-456789012345678")).not.toThrow();
  });

  it("rejeita token com path traversal", () => {
    expect(() => familyTokenSchema.parse("../../etc/passwd")).toThrow();
  });

  it("rejeita token curto", () => {
    expect(() => familyTokenSchema.parse("abc")).toThrow();
  });

  it("rejeita espaços", () => {
    expect(() => familyTokenSchema.parse("token com espaco aqui")).toThrow();
  });
});
