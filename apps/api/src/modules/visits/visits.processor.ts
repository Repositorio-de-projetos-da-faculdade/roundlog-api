// src/modules/visits/visits.processor.ts
// Worker BullMQ: lê o áudio do disco, manda pro Gemini, persiste resultado
// estruturado e dispara geração de FamilyUpdate para os familiares.
import { Worker } from "bullmq";
import { gemini, isGeminiEnabled, type VisitStructuredData } from "../../shared/gemini.js";
import { prisma } from "../../shared/prisma.js";
import { readAudioFile } from "../../shared/storage.js";
import { redisConnection } from "../../shared/queue.js";

function mimeFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "webm";
  const map: Record<string, string> = {
    webm: "audio/webm",
    wav: "audio/wav",
    mp3: "audio/mpeg",
    mpeg: "audio/mpeg",
    ogg: "audio/ogg",
    mp4: "audio/mp4",
    m4a: "audio/mp4",
  };
  return map[ext] ?? "audio/webm";
}

async function generateFamilyUpdates(
  visitId: string,
  admissionId: string,
  structured: VisitStructuredData,
) {
  const contacts = await prisma.familyContact.findMany({
    where: { admissionId },
    select: { id: true },
  });
  if (contacts.length === 0) return;

  if (!isGeminiEnabled()) {
    // Sem chave Gemini: cria um update placeholder por contato para que o
    // portal familiar tenha algo (em vez de chamar IA inexistente).
    await prisma.familyUpdate.createMany({
      data: contacts.map(() => ({
        admissionId,
        visitId,
        contentLay:
          "Há novas informações da última visita médica. Em breve um resumo detalhado estará disponível.",
      })),
    });
    return;
  }

  const summary = await gemini.generateFamilySummary(structured);
  await prisma.familyUpdate.createMany({
    data: contacts.map(() => ({
      admissionId,
      visitId,
      contentLay: summary,
    })),
  });
}

const audioWorker = new Worker(
  "audio-processing",
  async (job) => {
    const { visitId, audioUrl } = job.data as { visitId: string; audioUrl: string };

    console.log(`🎵 Processando áudio da visita ${visitId} (${audioUrl})...`);

    // Modo dev sem chave Gemini: marca visita como ERROR com mensagem clara
    if (!isGeminiEnabled()) {
      console.warn(
        `⚠️  GEMINI_API_KEY ausente — visita ${visitId} ficará como ERROR. Configure a chave no .env.`,
      );
      await prisma.visit.update({
        where: { id: visitId },
        data: {
          status: "ERROR",
          finishedAt: new Date(),
          transcriptRaw: "[Gemini desabilitado em ambiente de desenvolvimento]",
        },
      });
      return;
    }

    const audioBuffer = await readAudioFile(audioUrl);
    const mimeType = mimeFromPath(audioUrl);

    // Guard: áudio muito curto (<2 KB) tende a induzir alucinação no Gemini.
    // O modelo, sem áudio real pra transcrever, inventa uma "visita médica
    // plausível". Marcamos como ERROR com mensagem clara em vez de salvar lixo.
    if (audioBuffer.length < 2_000) {
      console.warn(
        `⚠️  Áudio muito curto (${audioBuffer.length} bytes) — visita ${visitId} marcada como ERROR.`,
      );
      await prisma.visit.update({
        where: { id: visitId },
        data: {
          status: "ERROR",
          finishedAt: new Date(),
          transcriptRaw:
            "[Áudio muito curto ou silencioso para transcrição confiável. Tente gravar novamente falando claramente por pelo menos 10 segundos.]",
        },
      });
      return;
    }

    const result = await gemini.processVisitAudio(audioBuffer, mimeType);

    // Guard pós-IA: se o modelo retornou transcript vazio (seguiu nossa regra
    // anti-alucinação ao não entender o áudio), marca como ERROR amigável.
    if (!result.transcript || result.transcript.trim().length < 5) {
      console.warn(
        `⚠️  Gemini retornou transcript vazio para visita ${visitId} — áudio possivelmente ininteligível.`,
      );
      await prisma.visit.update({
        where: { id: visitId },
        data: {
          status: "ERROR",
          finishedAt: new Date(),
          transcriptRaw:
            "[A IA não conseguiu entender o áudio. Tente gravar novamente em ambiente silencioso, falando próximo ao microfone e claramente em português.]",
        },
      });
      return;
    }

    // Persiste tudo em uma transação — visita + filhos
    const visit = await prisma.$transaction(async (tx) => {
      const updated = await tx.visit.update({
        where: { id: visitId },
        data: {
          transcriptRaw: result.transcript,
          structuredJson: result as unknown as object,
          status: "READY",
          finishedAt: new Date(),
        },
        select: { id: true, admissionId: true },
      });

      // Usamos createMany (sem relações) em vez de creates paralelas: é uma
      // round-trip por entidade, e evita o caso em que o Prisma client (após
      // regenerate) passa a exigir `visit: { connect }` em vez de aceitar a
      // FK escalar `visitId` na create individual.
      if (result.conducts.length > 0) {
        await tx.conduct.createMany({
          data: result.conducts.map((c) => ({
            visitId,
            description: c.description,
            priority: c.priority,
            deadlineAt: c.deadline_hours
              ? new Date(Date.now() + c.deadline_hours * 60 * 60 * 1000)
              : null,
          })),
        });
      }

      if (result.pendings.length > 0) {
        await tx.pending.createMany({
          data: result.pendings.map((p) => ({
            visitId,
            description: p.description,
            assignedToRole: p.assigned_to,
          })),
        });
      }

      if (result.alerts.length > 0) {
        await tx.clinicalAlert.createMany({
          data: result.alerts.map((a) => ({
            visitId,
            type: a.type,
            description: a.description,
            severity: a.severity,
          })),
        });
      }

      if (result.prescriptions.length > 0) {
        await tx.prescription.createMany({
          data: result.prescriptions.map((p) => ({
            visitId,
            medication: p.medication,
            dose: p.dose,
            route: p.route,
            frequency: p.frequency,
            duration: p.duration,
          })),
        });
      }

      return updated;
    });

    // Gera resumos para a família. Fora da transação para não bloquear o
    // lock do banco enquanto a IA roda.
    try {
      await generateFamilyUpdates(visit.id, visit.admissionId, result);
    } catch (err) {
      console.error(`⚠️  Falha ao gerar FamilyUpdate para visita ${visitId}:`, err);
      // Não falha o job — a visita já está processada
    }

    console.log(`✅ Visita ${visitId} processada com sucesso`);
  },
  { connection: redisConnection, concurrency: 2 },
);

audioWorker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} concluído`);
});

audioWorker.on("failed", async (job, err) => {
  console.error(`❌ Job ${job?.id} falhou:`, err.message);
  if (job?.data?.visitId) {
    try {
      await prisma.visit.update({
        where: { id: job.data.visitId },
        data: { status: "ERROR" },
      });
    } catch (updateErr) {
      console.error(`Falha ao marcar visita como ERROR:`, updateErr);
    }
  }
});

export { audioWorker };
