import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../../src/shared/utils/hash.js";

describe("hashPassword + verifyPassword", () => {
  it("produz hash diferente da senha", async () => {
    const hash = await hashPassword("senha-forte-123");
    expect(hash).not.toBe("senha-forte-123");
    expect(hash.length).toBeGreaterThan(20);
  });

  it("verifica senha correta", async () => {
    const hash = await hashPassword("senha-forte-123");
    expect(await verifyPassword("senha-forte-123", hash)).toBe(true);
  });

  it("rejeita senha errada", async () => {
    const hash = await hashPassword("senha-forte-123");
    expect(await verifyPassword("outra-senha", hash)).toBe(false);
  });

  it("produz hashes diferentes para mesma senha (salt)", async () => {
    const h1 = await hashPassword("igual");
    const h2 = await hashPassword("igual");
    expect(h1).not.toBe(h2);
  });
});
