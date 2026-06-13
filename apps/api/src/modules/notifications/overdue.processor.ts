// src/modules/notifications/overdue.processor.ts
// Worker BullMQ: scaneia condutas em atraso a cada N minutos.
// Para cada conduta atrasada inédita, persiste Notification in-app,
// envia e-mail E push aos enfermeiros/técnicos do hospital.
// Usa Redis SET para não notificar a mesma conduta de novo.
import { Worker } from "bullmq";
import { prisma } from "../../shared/prisma.js";
import { redisConnection } from "../../shared/queue.js";
import { sendEmail, overdueConductEmail } from "../../shared/resend.js";
import { sendPushToUsers } from "../../shared/push.js";

const NOTIFIED_KEY = "overdue:notified";
const NOTIFIED_TTL_DAYS = 7;

async function scanOverdueConducts() {
  const overdue = await prisma.conduct.findMany({
    where: {
      status: { not: "RESOLVED" },
      deadlineAt: { lt: new Date() },
    },
    include: {
      visit: {
        include: {
          admission: {
            include: {
              patient: { select: { name: true, hospitalId: true } },
              bed: { include: { ward: { select: { hospitalId: true } } } },
            },
          },
        },
      },
    },
  });

  if (overdue.length === 0) return { scanned: 0, notified: 0 };

  let notifiedCount = 0;

  for (const conduct of overdue) {
    const alreadyNotified = await redisConnection.sismember(NOTIFIED_KEY, conduct.id);
    if (alreadyNotified) continue;

    const hospitalId = conduct.visit.admission.bed.ward.hospitalId;
    const nurses = await prisma.user.findMany({
      where: { hospitalId, role: { in: ["NURSE", "TECHNICIAN"] } },
      select: { id: true, email: true },
    });

    if (nurses.length === 0) {
      await redisConnection.sadd(NOTIFIED_KEY, conduct.id);
      continue;
    }

    const patientName = conduct.visit.admission.patient.name;
    const bedCode = conduct.visit.admission.bed.code;
    const title = `Conduta em atraso — leito ${bedCode}`;
    const body = `${patientName}: ${conduct.description}`;
    const url = `/visits/${conduct.visitId}`;

    // Histórico in-app — persiste uma notification por usuário
    await prisma.notification.createMany({
      data: nurses.map((n) => ({
        userId: n.id,
        type: "overdue",
        title,
        body,
        url,
      })),
    });

    // E-mail (Resend ou dry-run)
    const { subject, html } = overdueConductEmail({
      patientName,
      bed: bedCode,
      description: conduct.description,
      deadlineAt: conduct.deadlineAt!,
    });
    await sendEmail({ to: nurses.map((n) => n.email), subject, html });

    // Push notification (web-push ou dry-run)
    await sendPushToUsers(nurses.map((n) => n.id), {
      title,
      body,
      url,
      tag: `overdue-${conduct.id}`,
    });

    await redisConnection.sadd(NOTIFIED_KEY, conduct.id);
    notifiedCount++;
  }

  await redisConnection.expire(NOTIFIED_KEY, NOTIFIED_TTL_DAYS * 24 * 3600);

  return { scanned: overdue.length, notified: notifiedCount };
}

const overdueWorker = new Worker(
  "overdue-scan",
  async () => {
    const result = await scanOverdueConducts();
    if (result.notified > 0) {
      console.log(`📬 Overdue scan: ${result.notified}/${result.scanned} notificadas`);
    }
    return result;
  },
  { connection: redisConnection, concurrency: 1 },
);

overdueWorker.on("failed", (job, err) => {
  console.error(`❌ Overdue scan ${job?.id} falhou:`, err.message);
});

export { overdueWorker };
