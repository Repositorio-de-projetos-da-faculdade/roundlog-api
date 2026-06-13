// src/jobs/audio.worker.ts
// Processo separado: consome filas de áudio e de overdue.
// Execute com: npm run worker (ou: tsx src/jobs/audio.worker.ts)

import "../modules/visits/visits.processor.js";
import "../modules/notifications/overdue.processor.js";
import { ensureOverdueScanScheduled } from "../shared/queue.js";

async function bootstrap() {
  const intervalMin = Number(process.env.OVERDUE_SCAN_INTERVAL_MINUTES) || 5;
  await ensureOverdueScanScheduled(intervalMin);
  console.log(
    `🎧 Workers iniciados: audio-processing + overdue-scan (cada ${intervalMin}min). Aguardando jobs...`,
  );
}

bootstrap().catch((err) => {
  console.error("Falha ao inicializar workers:", err);
  process.exit(1);
});
