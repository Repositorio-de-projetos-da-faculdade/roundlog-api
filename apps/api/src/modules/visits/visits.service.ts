// src/modules/visits/visits.service.ts
import { prisma } from "../../shared/prisma.js";
import { audioQueue } from "../../shared/queue.js";
import type { CreateVisitInput } from "./visits.schema.js";
import type { MultipartFile } from "@fastify/multipart";

export class VisitsService {
  async createVisit(data: CreateVisitInput, physicianId: string) {
    return prisma.visit.create({
      data: {
        admissionId: data.admissionId,
        physicianId,
        status: "RECORDING",
      },
    });
  }

  async uploadAndEnqueueAudio(visitId: string, file: MultipartFile) {
    // 1. Converte o stream para buffer
    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // TODO: Salvar no storage (S3 / Uploadthing)
    const audioUrl = `local://uploads/visits/${visitId}/${file.filename}`;

    // 2. Atualiza o visit com a URL e muda status
    await prisma.visit.update({
      where: { id: visitId },
      data: { audioUrl, status: "PROCESSING" },
    });

    // 3. Enfileira o processamento
    await audioQueue.add("process-visit-audio", { visitId, audioUrl });
  }

  async getVisit(id: string) {
    return prisma.visit.findUniqueOrThrow({
      where: { id },
      include: {
        conducts: true,
        pendings: true,
        alerts: true,
        prescriptions: true,
        physician: {
          select: { id: true, name: true, crm: true },
        },
        admission: {
          include: { patient: true },
        },
      },
    });
  }

  async resolveConductById(conductId: string, userId: string) {
    return prisma.conduct.update({
      where: { id: conductId },
      data: {
        status: "RESOLVED",
        resolvedById: userId,
        resolvedAt: new Date(),
      },
    });
  }

  async resolvePendingById(pendingId: string, userId: string) {
    return prisma.pending.update({
      where: { id: pendingId },
      data: {
        status: "RESOLVED",
        resolvedById: userId,
        resolvedAt: new Date(),
      },
    });
  }

  async acknowledgeAlertById(alertId: string, userId: string) {
    return prisma.clinicalAlert.update({
      where: { id: alertId },
      data: {
        acknowledgedById: userId,
        acknowledgedAt: new Date(),
      },
    });
  }
}
