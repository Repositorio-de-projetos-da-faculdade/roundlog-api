import { describe, expect, it } from "vitest";
import {
  SUPPORTED_AUDIO_MIMES,
  generateAudioFileName,
  isValidAudioMime,
} from "../../src/shared/utils/audio.js";

describe("isValidAudioMime", () => {
  it("aceita todos os MIMEs suportados", () => {
    for (const mime of SUPPORTED_AUDIO_MIMES) {
      expect(isValidAudioMime(mime)).toBe(true);
    }
  });

  it("rejeita MIMEs não suportados", () => {
    expect(isValidAudioMime("application/pdf")).toBe(false);
    expect(isValidAudioMime("audio/flac")).toBe(false);
    expect(isValidAudioMime("")).toBe(false);
    expect(isValidAudioMime("text/plain")).toBe(false);
  });
});

describe("generateAudioFileName", () => {
  it("gera caminho relativo no formato esperado", () => {
    const name = generateAudioFileName("visit-abc");
    expect(name).toMatch(/^visits\/visit-abc\/\d+\.webm$/);
  });

  it("respeita a extensão informada", () => {
    const name = generateAudioFileName("visit-xyz", "wav");
    expect(name).toMatch(/^visits\/visit-xyz\/\d+\.wav$/);
  });
});
