// src/modules/handoffs/handoffs.service.ts
import { prisma } from "../../shared/prisma.js";
import { gemini } from "../../shared/gemini.js";
import type { GenerateHandoffInput } from "./handoffs.schema.js";

export class HandoffsService {
  async generateHandoff(data: GenerateHandoffInput) {
    // Busca dados da ala para o resumo
    const ward = await prisma.ward.findUniqueOrThrow({
      where: { id: data.wardId },
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

    // Monta dados para o LLM
    const wardData = {
      wardName: ward.name,
      shiftType: "current",
      patients: ward.beds
        .flatMap((bed) =>
          bed.admissions.map((adm) => ({
            name: adm.patient.name,
            bed: bed.code,
            diagnosis: adm.diagnosis ?? "Sem diagnóstico",
            openConducts: adm.visits
              .flatMap((v) => v.conducts.map((c) => c.description)),
            alerts: adm.visits
              .flatMap((v) => v.alerts.map((a) => a.description)),
          }))
        ),
    };

    // Gera resumo com LLM
    const summaryText = await gemini.generateHandoffSummary(wardData);

    // Salva o handoff
    const handoff = await prisma.shiftHandoff.create({
      data: {
        wardId: data.wardId,
        fromShiftId: data.fromShiftId,
        summaryJson: { text: summaryText, data: wardData } as any,
      },
    });

    return handoff;
  }

  async getHandoff(id: string) {
    return prisma.shiftHandoff.findUniqueOrThrow({
      where: { id },
      include: {
        ward: true,
        fromShift: { include: { nurse: { select: { name: true } } } },
        toShift: { include: { nurse: { select: { name: true } } } },
        acks: { include: { user: { select: { name: true, role: true } } } },
      },
    });
  }

  async acknowledgeHandoff(handoffId: string, userId: string) {
    const ack = await prisma.handoffAck.create({
      data: {
        handoffId,
        userId,
      },
    });

    // Marca handoff como ACKNOWLEDGED
    await prisma.shiftHandoff.update({
      where: { id: handoffId },
      data: { status: "ACKNOWLEDGED" },
    });

    return ack;
  }
}
