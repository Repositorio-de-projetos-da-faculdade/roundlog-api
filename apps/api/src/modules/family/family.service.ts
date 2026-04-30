// src/modules/family/family.service.ts
import { prisma } from "../../shared/prisma.js";
import { gemini } from "../../shared/gemini.js";
import { NotFoundError } from "../../shared/errors.js";

export class FamilyService {
  private async getAdmissionByToken(token: string) {
    const contact = await prisma.familyContact.findUnique({
      where: { accessToken: token },
      include: { admission: { include: { patient: true } } },
    });

    if (!contact) {
      throw new NotFoundError("Acesso familiar");
    }

    return contact.admission;
  }

  async getUpdates(token: string) {
    const admission = await this.getAdmissionByToken(token);

    return prisma.familyUpdate.findMany({
      where: { admissionId: admission.id },
      orderBy: { generatedAt: "desc" },
    });
  }

  async getSummary(token: string) {
    const admission = await this.getAdmissionByToken(token);

    // Busca última visita com dados estruturados
    const lastVisit = await prisma.visit.findFirst({
      where: {
        admissionId: admission.id,
        status: "READY",
        structuredJson: { not: null as any },
      },
      orderBy: { startedAt: "desc" },
    });

    if (!lastVisit || !lastVisit.structuredJson) {
      return {
        patientName: admission.patient.name,
        summary: "Ainda não há informações clínicas disponíveis para resumo.",
      };
    }

    const summary = await gemini.generateFamilySummary(lastVisit.structuredJson as object);

    // Salva o update
    await prisma.familyUpdate.create({
      data: {
        admissionId: admission.id,
        visitId: lastVisit.id,
        contentLay: summary,
      },
    });

    return {
      patientName: admission.patient.name,
      summary,
    };
  }

  async sendMessage(token: string, content: string) {
    const admission = await this.getAdmissionByToken(token);

    return prisma.familyMessage.create({
      data: {
        admissionId: admission.id,
        fromFamily: true,
        content,
      },
    });
  }
}
