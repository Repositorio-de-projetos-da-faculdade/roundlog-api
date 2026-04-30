// src/modules/visits/visits.processor.ts
// Worker Bull: chama Gemini + salva resultado estruturado
import { Worker } from "bullmq";
import { gemini } from "../../shared/gemini.js";
import { prisma } from "../../shared/prisma.js";
import { redisConnection } from "../../shared/queue.js";

const audioWorker = new Worker(
  "audio-processing",
  async (job) => {
    const { visitId, audioUrl } = job.data;

    try {
      console.log(`🎵 Processando áudio da visita ${visitId}...`);

      // 1. Busca o áudio (TODO: implementar fetch do storage real)
      // const audioBuffer = await fetchAudioBuffer(audioUrl);
      // Placeholder para dev:
      const audioBuffer = Buffer.from("placeholder-audio");

      // 2. Envia para Gemini
      const result = await gemini.processVisitAudio(audioBuffer);

      // 3. Salva o resultado estruturado em transação
      await prisma.$transaction([
        prisma.visit.update({
          where: { id: visitId },
          data: {
            transcriptRaw: result.transcript,
            structuredJson: result as any,
            status: "READY",
            finishedAt: new Date(),
          },
        }),
        ...result.conducts.map((c) =>
          prisma.conduct.create({
            data: {
              visitId,
              description: c.description,
              priority: c.priority,
              deadlineAt: c.deadline_hours
                ? new Date(Date.now() + c.deadline_hours * 60 * 60 * 1000)
                : null,
            },
          })
        ),
        ...result.pendings.map((p) =>
          prisma.pending.create({
            data: {
              visitId,
              description: p.description,
              assignedToRole: p.assigned_to,
            },
          })
        ),
        ...result.alerts.map((a) =>
          prisma.clinicalAlert.create({
            data: {
              visitId,
              type: a.type,
              description: a.description,
              severity: a.severity,
            },
          })
        ),
        ...result.prescriptions.map((p) =>
          prisma.prescription.create({
            data: {
              visitId,
              medication: p.medication,
              dose: p.dose,
              route: p.route,
              frequency: p.frequency,
              duration: p.duration,
            },
          })
        ),
      ]);

      console.log(`✅ Visita ${visitId} processada com sucesso`);
    } catch (error) {
      console.error(`❌ Erro ao processar visita ${visitId}:`, error);

      await prisma.visit.update({
        where: { id: visitId },
        data: { status: "ERROR" },
      });

      throw error; // Bull vai fazer retry automático
    }
  },
  { connection: redisConnection }
);

audioWorker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} concluído`);
});

audioWorker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} falhou:`, err.message);
});

export { audioWorker };
