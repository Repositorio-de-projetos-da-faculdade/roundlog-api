import { describe, expect, it, beforeEach } from "vitest";
import { isGeminiEnabled } from "../../src/shared/gemini.js";

describe("isGeminiEnabled", () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  it("retorna false sem chave", () => {
    expect(isGeminiEnabled()).toBe(false);
  });

  it("retorna true com chave", () => {
    process.env.GEMINI_API_KEY = "fake-key";
    expect(isGeminiEnabled()).toBe(true);
    delete process.env.GEMINI_API_KEY;
  });
});
