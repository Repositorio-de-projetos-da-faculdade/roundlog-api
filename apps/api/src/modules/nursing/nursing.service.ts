// src/modules/nursing/nursing.service.ts
import { prisma } from "../../shared/prisma.js";
import { NotFoundError } from "../../shared/errors.js";
import type { ExecuteConductInput } from "./nursing.schema.js";

export class NursingService {
  async getWardDashboard(wardId: string, hospitalId: string) {
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

  async executeConduct(
    conductId: string,
    data: ExecuteConductInput,
    nurseId: string,
    hospitalId: string,
  ) {
    // Garante que a conduta pertence ao hospital do enfermeiro
    const conduct = await prisma.conduct.findFirst({
      where: {
        id: conductId,
        visit: { admission: { bed: { ward: { hospitalId } } } },
      },
    });
    if (!conduct) throw new NotFoundError("Conduta");

    // Garante que o turno também pertence ao hospital
    const shift = await prisma.nursingShift.findFirst({
      where: { id: data.shiftId, ward: { hospitalId } },
    });
    if (!shift) throw new NotFoundError("Turno de enfermagem");

    return prisma.$transaction(async (tx) => {
      const execution = await tx.nursingExecution.create({
        data: {
          conductId,
          shiftId: data.shiftId,
          nurseId,
          notes: data.notes,
          status: data.status,
        },
      });

      if (data.status === "done") {
        await tx.conduct.update({
          where: { id: conductId },
          data: { status: "RESOLVED", resolvedById: nurseId, resolvedAt: new Date() },
        });
      } else {
        await tx.conduct.update({
          where: { id: conductId },
          data: { status: "IN_PROGRESS" },
        });
      }

      return execution;
    });
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
