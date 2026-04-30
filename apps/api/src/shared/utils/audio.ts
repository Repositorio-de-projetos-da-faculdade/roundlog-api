// src/shared/utils/audio.ts

/**
 * Tipos MIME de áudio suportados pelo sistema
 */
export const SUPPORTED_AUDIO_MIMES = [
  "audio/webm",
  "audio/wav",
  "audio/mp3",
  "audio/mpeg",
  "audio/ogg",
  "audio/mp4",
] as const;

/**
 * Tamanho máximo do arquivo de áudio em bytes (50MB)
 */
export const MAX_AUDIO_SIZE = 50 * 1024 * 1024;

/**
 * Valida se o tipo MIME do áudio é suportado
 */
export function isValidAudioMime(mime: string): boolean {
  return SUPPORTED_AUDIO_MIMES.includes(mime as typeof SUPPORTED_AUDIO_MIMES[number]);
}

/**
 * Gera um nome de arquivo único para upload
 */
export function generateAudioFileName(visitId: string, extension: string = "webm"): string {
  const timestamp = Date.now();
  return `visits/${visitId}/${timestamp}.${extension}`;
}
