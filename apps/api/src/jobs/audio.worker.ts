// src/jobs/audio.worker.ts
// Processo separado que consome a fila de áudio
// Execute com: npx tsx src/jobs/audio.worker.ts

import "../modules/visits/visits.processor.js";

console.log("🎧 Audio worker iniciado. Aguardando jobs...");
