// src/modules/family/family.service.ts
import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/prisma.js";
import { gemini, isGeminiEnabled } from "../../shared/gemini.js";
import { NotFoundError } from "../../shared/errors.js";
import type { VisitStructuredData } from "../../shared/gemini.js";
import { calcAge, calcDaysAdmitted, buildTimeline } from "./family.helpers.js";

export class FamilyService {
  private async getAdmissionByToken(token: string) {
    const contact = await prisma.familyContact.findUnique({
      where: { accessToken: token },
      include: { admission: { include: { patient: true } } },
    });

    if (!contact) {
      throw new NotFoundError("Acesso familiar");
    }

    return { admission: contact.admission, contactId: contact.id };
  }

  async getUpdates(token: string) {
    const { admission } = await this.getAdmissionByToken(token);

    return prisma.familyUpdate.findMany({
      where: { admissionId: admission.id },
      orderBy: { generatedAt: "desc" },
    });
  }

  async getSummary(token: string) {
    const { admission } = await this.getAdmissionByToken(token);

    // Preferência 1: pegar o FamilyUpdate mais recente (gerado pelo worker)
    const latestUpdate = await prisma.familyUpdate.findFirst({
      where: { admissionId: admission.id },
      orderBy: { generatedAt: "desc" },
    });

    if (latestUpdate) {
      return {
        patientName: admission.patient.name,
        summary: latestUpdate.contentLay,
        generatedAt: latestUpdate.generatedAt,
      };
    }

    // Preferência 2: gerar on-demand a partir da última visita pronta
    const lastVisit = await prisma.visit.findFirst({
      where: {
        admissionId: admission.id,
        status: "READY",
        structuredJson: { not: Prisma.JsonNull },
      },
      orderBy: { startedAt: "desc" },
    });

    if (!lastVisit || !lastVisit.structuredJson) {
      return {
        patientName: admission.patient.name,
        summary: "Ainda não há informações clínicas disponíveis para resumo.",
        generatedAt: null,
      };
    }

    if (!isGeminiEnabled()) {
      return {
        patientName: admission.patient.name,
        summary:
          "Há informações clínicas registradas, mas o resumo automático está temporariamente indisponível. Entre em contato com a equipe assistencial.",
        generatedAt: null,
      };
    }

    const summary = await gemini.generateFamilySummary(
      lastVisit.structuredJson as unknown as VisitStructuredData,
    );

    const update = await prisma.familyUpdate.create({
      data: {
        admissionId: admission.id,
        visitId: lastVisit.id,
        contentLay: summary,
      },
    });

    return {
      patientName: admission.patient.name,
      summary,
      generatedAt: update.generatedAt,
    };
  }

  async getOverview(token: string) {
    const contact = await prisma.familyContact.findUnique({
      where: { accessToken: token },
      include: {
        admission: {
          include: {
            patient: true,
            bed: { include: { ward: true } },
          },
        },
      },
    });

    if (!contact) {
      throw new NotFoundError("Acesso familiar");
    }

    const { admission } = contact;
    const { patient } = admission;

    const now = new Date();

    // Visitas prontas (READY) — base para stats e timeline.
    const readyVisits = await prisma.visit.findMany({
      where: { admissionId: admission.id, status: "READY" },
      select: { id: true, startedAt: true, finishedAt: true },
      orderBy: { startedAt: "desc" },
    });

    const familyUpdates = await prisma.familyUpdate.findMany({
      where: { admissionId: admission.id },
      orderBy: { generatedAt: "desc" },
      select: { id: true, contentLay: true, generatedAt: true },
    });

    // Condutas agregadas (sem expor descrições/dados clínicos crus).
    const [conductsTotal, conductsResolved] = await Promise.all([
      prisma.conduct.count({ where: { visit: { admissionId: admission.id } } }),
      prisma.conduct.count({
        where: { visit: { admissionId: admission.id }, status: "RESOLVED" },
      }),
    ]);

    const lastVisitAt = readyVisits[0]?.startedAt ?? null;

    return {
      patient: {
        name: patient.name,
        age: calcAge(patient.dob, now),
        bloodType: patient.bloodType,
        allergies: patient.allergies,
      },
      admission: {
        admittedAt: admission.admittedAt,
        dischargedAt: admission.dischargedAt,
        status: admission.status,
        diagnosis: admission.diagnosis,
        daysAdmitted: calcDaysAdmitted(
          admission.admittedAt,
          admission.dischargedAt,
          now,
        ),
        ward: admission.bed.ward.name,
        bed: admission.bed.code,
      },
      stats: {
        totalVisits: readyVisits.length,
        lastVisitAt,
        updatesCount: familyUpdates.length,
        conductsResolved,
        conductsTotal,
      },
      timeline: buildTimeline(
        readyVisits.map((v) => v.startedAt),
        familyUpdates.map((u) => u.generatedAt),
        now,
      ),
      recentUpdates: familyUpdates.slice(0, 5).map((u) => ({
        id: u.id,
        contentLay: u.contentLay,
        generatedAt: u.generatedAt,
      })),
    };
  }

  async sendMessage(token: string, content: string) {
    const { admission } = await this.getAdmissionByToken(token);

    return prisma.familyMessage.create({
      data: {
        admissionId: admission.id,
        fromFamily: true,
        content,
      },
    });
  }
}
