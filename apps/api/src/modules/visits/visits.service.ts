// src/modules/visits/visits.service.ts
import { prisma } from "../../shared/prisma.js";
import { audioQueue } from "../../shared/queue.js";
import { NotFoundError } from "../../shared/errors.js";
import type { CreateVisitInput } from "./visits.schema.js";
import type { MultipartFile } from "@fastify/multipart";

export class VisitsService {
  async createVisit(data: CreateVisitInput, physicianId: string, hospitalId: string) {
    // Garante que a internação pertence ao mesmo hospital do médico
    const admission = await prisma.admission.findFirst({
      where: { id: data.admissionId, bed: { ward: { hospitalId } } },
    });
    if (!admission) throw new NotFoundError("Internação");

    return prisma.visit.create({
      data: {
        admissionId: data.admissionId,
        physicianId,
        status: "RECORDING",
      },
    });
  }

  async uploadAndEnqueueAudio(visitId: string, file: MultipartFile, hospitalId: string) {
    // Garante scope antes de processar o upload
    const visit = await prisma.visit.findFirst({
      where: { id: visitId, admission: { bed: { ward: { hospitalId } } } },
    });
    if (!visit) throw new NotFoundError("Visita");

    // Converte o stream para buffer
    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Storage local: grava no disco e salva caminho relativo
    const { saveAudioFile } = await import("../../shared/storage.js");
    const audioUrl = await saveAudioFile(visitId, file.filename, buffer);

    await prisma.visit.update({
      where: { id: visitId },
      data: { audioUrl, status: "PROCESSING" },
    });

    await audioQueue.add("process-visit-audio", { visitId, audioUrl });
  }

  async getVisit(id: string, hospitalId: string) {
    const visit = await prisma.visit.findFirst({
      where: { id, admission: { bed: { ward: { hospitalId } } } },
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
    if (!visit) throw new NotFoundError("Visita");
    return visit;
  }

  async resolveConductById(conductId: string, userId: string, hospitalId: string) {
    const conduct = await prisma.conduct.findFirst({
      where: {
        id: conductId,
        visit: { admission: { bed: { ward: { hospitalId } } } },
      },
    });
    if (!conduct) throw new NotFoundError("Conduta");

    return prisma.conduct.update({
      where: { id: conductId },
      data: {
        status: "RESOLVED",
        resolvedById: userId,
        resolvedAt: new Date(),
      },
    });
  }

  async resolvePendingById(pendingId: string, userId: string, hospitalId: string) {
    const pending = await prisma.pending.findFirst({
      where: {
        id: pendingId,
        visit: { admission: { bed: { ward: { hospitalId } } } },
      },
    });
    if (!pending) throw new NotFoundError("Pendência");

    return prisma.pending.update({
      where: { id: pendingId },
      data: {
        status: "RESOLVED",
        resolvedById: userId,
        resolvedAt: new Date(),
      },
    });
  }

  async acknowledgeAlertById(alertId: string, userId: string, hospitalId: string) {
    const alert = await prisma.clinicalAlert.findFirst({
      where: {
        id: alertId,
        visit: { admission: { bed: { ward: { hospitalId } } } },
      },
    });
    if (!alert) throw new NotFoundError("Alerta clínico");

    return prisma.clinicalAlert.update({
      where: { id: alertId },
      data: {
        acknowledgedById: userId,
        acknowledgedAt: new Date(),
      },
    });
  }
}
