import { afterAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readAudioFile, saveAudioFile } from "../../src/shared/storage.js";

// Storage usa process.cwd() como raiz — apontamos para um tmp isolado
const sandboxDir = mkdtempSync(join(tmpdir(), "roundlog-storage-"));
const originalCwd = process.cwd();
process.chdir(sandboxDir);

afterAll(() => {
  process.chdir(originalCwd);
  rmSync(sandboxDir, { recursive: true, force: true });
});

describe("storage", () => {
  it("grava e relê um arquivo de áudio", async () => {
    const buffer = Buffer.from("ola mundo audio");
    const path = await saveAudioFile("visit-1", "gravacao.webm", buffer);

    expect(path).toMatch(/^uploads\/visits\/visit-1\/\d+\.webm$/);

    const read = await readAudioFile(path);
    expect(read.toString()).toBe("ola mundo audio");
  });

  it("usa fallback de extensão quando filename não tem", async () => {
    const path = await saveAudioFile("visit-2", "semextensao", Buffer.from(""));
    expect(path).toMatch(/\.webm$/);
  });

  it("normaliza forward-slash mesmo em paths nativos", async () => {
    const path = await saveAudioFile("visit-3", "x.mp3", Buffer.from("a"));
    expect(path.includes("\\")).toBe(false);
  });

  it("bloqueia path traversal", async () => {
    await expect(readAudioFile("../etc/passwd")).rejects.toThrow();
    await expect(readAudioFile("uploads/../../../etc/passwd")).rejects.toThrow();
  });

  it("lança NotFoundError para arquivo inexistente", async () => {
    await expect(readAudioFile("uploads/visits/nope/123.webm")).rejects.toThrow();
  });
});
