// src/shared/storage.ts
// Storage local de áudios. Em produção: trocar por S3 / Uploadthing.
import { promises as fs } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { NotFoundError } from "./errors.js";

// Computado lazily para respeitar mudanças de cwd (úteis em testes)
const uploadsRoot = () => resolve(process.cwd(), "uploads");

function extFromFilename(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx < 0 || idx === filename.length - 1) return "webm";
  return filename.slice(idx + 1).toLowerCase().replace(/[^a-z0-9]/g, "") || "webm";
}

/**
 * Grava o buffer em uploads/visits/{visitId}/{timestamp}.{ext} e devolve
 * o caminho relativo (a partir da raiz da API), usado para servir via
 * @fastify/static e para o worker ler de volta.
 */
export async function saveAudioFile(
  visitId: string,
  originalFilename: string,
  buffer: Buffer,
): Promise<string> {
  const ext = extFromFilename(originalFilename);
  const timestamp = Date.now();
  const relativePath = join("uploads", "visits", visitId, `${timestamp}.${ext}`);
  const absolutePath = join(process.cwd(), relativePath);

  await fs.mkdir(dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);

  // Normaliza para forward-slash (URL e cross-platform)
  return relativePath.split("\\").join("/");
}

/**
 * Lê o arquivo de áudio gravado pelo upload. Lança NotFoundError se
 * o caminho não existir mais (arquivo apagado, etc.).
 */
export async function readAudioFile(relativePath: string): Promise<Buffer> {
  // Defesa: impede path traversal — só aceita caminhos dentro de uploads/
  const absolutePath = resolve(process.cwd(), relativePath);
  if (!absolutePath.startsWith(uploadsRoot())) {
    throw new NotFoundError("Arquivo de áudio");
  }
  try {
    return await fs.readFile(absolutePath);
  } catch {
    throw new NotFoundError("Arquivo de áudio");
  }
}

export const getUploadsDir = uploadsRoot;
