// src/modules/admissions/admissions.service.ts
import { prisma } from "../../shared/prisma.js";
import { ConflictError, NotFoundError } from "../../shared/errors.js";
import type { CreateAdmissionInput } from "./admissions.schema.js";

export class AdmissionsService {
  async createAdmission(data: CreateAdmissionInput, userId: string) {
    // Verifica se o leito está disponível
    const bed = await prisma.bed.findUniqueOrThrow({
      where: { id: data.bedId },
    });

    if (bed.status !== "AVAILABLE") {
      throw new ConflictError("Leito não está disponível");
    }

    return prisma.$transaction(async (tx) => {
      const admission = await tx.admission.create({
        data: {
          patientId: data.patientId,
          bedId: data.bedId,
          admittedById: userId,
          diagnosis: data.diagnosis,
        },
      });

      await tx.bed.update({
        where: { id: data.bedId },
        data: { status: "OCCUPIED" },
      });

      return admission;
    });
  }

  async discharge(admissionId: string) {
    const admission = await prisma.admission.findUniqueOrThrow({
      where: { id: admissionId },
    });

    if (admission.status === "DISCHARGED") {
      throw new ConflictError("Internação já foi encerrada");
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.admission.update({
        where: { id: admissionId },
        data: {
          status: "DISCHARGED",
          dischargedAt: new Date(),
        },
      });

      await tx.bed.update({
        where: { id: admission.bedId },
        data: { status: "AVAILABLE" },
      });

      return updated;
    });
  }

  async getAdmission(id: string) {
    return prisma.admission.findUniqueOrThrow({
      where: { id },
      include: {
        patient: true,
        bed: { include: { ward: true } },
        visits: {
          orderBy: { startedAt: "desc" },
          include: { conducts: true, pendings: true, alerts: true },
        },
        familyContacts: true,
      },
    });
  }
}
