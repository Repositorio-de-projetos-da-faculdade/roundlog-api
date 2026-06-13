// src/modules/handoffs/handoffs.service.ts
import { prisma } from "../../shared/prisma.js";
import { gemini } from "../../shared/gemini.js";
import { NotFoundError } from "../../shared/errors.js";
import type { GenerateHandoffInput } from "./handoffs.schema.js";

export class HandoffsService {
  async generateHandoff(data: GenerateHandoffInput, hospitalId: string) {
    // Verifica que a ala e o turno pertencem ao hospital do usuário
    const ward = await prisma.ward.findFirst({
      where: { id: data.wardId, hospitalId },
      include: {
        beds: {
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
                    alerts: { where: { acknowledgedAt: null } },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!ward) throw new NotFoundError("Ala");

    const fromShift = await prisma.nursingShift.findFirst({
      where: { id: data.fromShiftId, wardId: data.wardId },
    });
    if (!fromShift) throw new NotFoundError("Turno de origem");

    const wardData = {
      wardName: ward.name,
      shiftType: "current",
      patients: ward.beds.flatMap((bed) =>
        bed.admissions.map((adm) => ({
          name: adm.patient.name,
          bed: bed.code,
          diagnosis: adm.diagnosis ?? "Sem diagnóstico",
          openConducts: adm.visits.flatMap((v) => v.conducts.map((c) => c.description)),
          alerts: adm.visits.flatMap((v) => v.alerts.map((a) => a.description)),
        })),
      ),
    };

    const summaryText = await gemini.generateHandoffSummary(wardData);

    const handoff = await prisma.shiftHandoff.create({
      data: {
        wardId: data.wardId,
        fromShiftId: data.fromShiftId,
        summaryJson: { text: summaryText, data: wardData },
      },
    });

    return handoff;
  }

  async getHandoff(id: string, hospitalId: string) {
    const handoff = await prisma.shiftHandoff.findFirst({
      where: { id, ward: { hospitalId } },
      include: {
        ward: true,
        fromShift: { include: { nurse: { select: { name: true } } } },
        toShift: { include: { nurse: { select: { name: true } } } },
        acks: { include: { user: { select: { name: true, role: true } } } },
      },
    });
    if (!handoff) throw new NotFoundError("Passagem de plantão");
    return handoff;
  }

  async acknowledgeHandoff(handoffId: string, userId: string, hospitalId: string) {
    const handoff = await prisma.shiftHandoff.findFirst({
      where: { id: handoffId, ward: { hospitalId } },
    });
    if (!handoff) throw new NotFoundError("Passagem de plantão");

    return prisma.$transaction(async (tx) => {
      const ack = await tx.handoffAck.create({
        data: { handoffId, userId },
      });

      await tx.shiftHandoff.update({
        where: { id: handoffId },
        data: { status: "ACKNOWLEDGED" },
      });

      return ack;
    });
  }
}
