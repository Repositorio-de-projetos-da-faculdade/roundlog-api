// src/modules/nursing/nursing.service.ts
import { prisma } from "../../shared/prisma.js";
import type { ExecuteConductInput } from "./nursing.schema.js";

export class NursingService {
  async getWardDashboard(wardId: string, hospitalId: string) {
    // Verifica que a ala pertence ao hospital
    await prisma.ward.findFirstOrThrow({
      where: { id: wardId, hospitalId },
    });

    const beds = await prisma.bed.findMany({
      where: { wardId },
      include: {
        admissions: {
          where: { status: "ACTIVE" },
          include: {
            patient: true,
            visits: {
              orderBy: { startedAt: "desc" },
              take: 1,
              include: {
                conducts: { where: { status: { not: "RESOLVED" } } },
                pendings: { where: { status: { not: "RESOLVED" } } },
                alerts: { where: { acknowledgedAt: null } },
              },
            },
          },
        },
      },
    });

    return beds;
  }

  async executeConduct(conductId: string, data: ExecuteConductInput, nurseId: string) {
    const execution = await prisma.nursingExecution.create({
      data: {
        conductId,
        shiftId: data.shiftId,
        nurseId,
        notes: data.notes,
        status: data.status,
      },
    });

    // Se executado com sucesso, marca conduta como IN_PROGRESS
    if (data.status === "done") {
      await prisma.conduct.update({
        where: { id: conductId },
        data: { status: "RESOLVED", resolvedById: nurseId, resolvedAt: new Date() },
      });
    } else {
      await prisma.conduct.update({
        where: { id: conductId },
        data: { status: "IN_PROGRESS" },
      });
    }

    return execution;
  }

  async getOverdueConducts(hospitalId: string) {
    return prisma.conduct.findMany({
      where: {
        status: { not: "RESOLVED" },
        deadlineAt: { lt: new Date() },
        visit: {
          admission: {
            bed: {
              ward: { hospitalId },
            },
          },
        },
      },
      include: {
        visit: {
          include: {
            admission: {
              include: { patient: true, bed: true },
            },
          },
        },
      },
      orderBy: { deadlineAt: "asc" },
    });
  }
}
