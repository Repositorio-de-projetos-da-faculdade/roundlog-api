// src/modules/analytics/analytics.service.ts
import { prisma } from "../../shared/prisma.js";
import type { DateRangeInput } from "./analytics.schema.js";

const DEFAULT_WINDOW_DAYS = 30;

function resolveRange(range: DateRangeInput) {
  const to = range.to ? new Date(range.to) : new Date();
  const from = range.from
    ? new Date(range.from)
    : new Date(to.getTime() - DEFAULT_WINDOW_DAYS * 24 * 3600 * 1000);
  return { from, to };
}

export class AnalyticsService {
  async getWardAnalytics(wardId: string, hospitalId: string) {
    // Ocupação é estado instantâneo — não filtra por data.
    await prisma.ward.findFirstOrThrow({ where: { id: wardId, hospitalId } });

    const totalBeds = await prisma.bed.count({ where: { wardId } });
    const occupiedBeds = await prisma.bed.count({ where: { wardId, status: "OCCUPIED" } });
    const activeAdmissions = await prisma.admission.count({
      where: { status: "ACTIVE", bed: { wardId } },
    });

    return {
      wardId,
      totalBeds,
      occupiedBeds,
      occupancyRate: totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0,
      activeAdmissions,
    };
  }

  /**
   * Compliance no período. Conduta entra no denominador se foi criada
   * dentro do range; entra no numerador se também foi resolvida.
   */
  async getComplianceMetrics(hospitalId: string, range: DateRangeInput) {
    const { from, to } = resolveRange(range);
    const scope = { visit: { admission: { bed: { ward: { hospitalId } } } } };

    const totalConducts = await prisma.conduct.count({
      where: { ...scope, visit: { ...scope.visit, startedAt: { gte: from, lte: to } } },
    });
    const resolvedConducts = await prisma.conduct.count({
      where: {
        ...scope,
        status: "RESOLVED",
        visit: { ...scope.visit, startedAt: { gte: from, lte: to } },
      },
    });

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      totalConducts,
      resolvedConducts,
      complianceRate: totalConducts > 0 ? (resolvedConducts / totalConducts) * 100 : 0,
    };
  }

  async getHandoffMetrics(hospitalId: string, range: DateRangeInput) {
    const { from, to } = resolveRange(range);
    const where = { ward: { hospitalId }, generatedAt: { gte: from, lte: to } };

    const totalHandoffs = await prisma.shiftHandoff.count({ where });
    const acknowledgedHandoffs = await prisma.shiftHandoff.count({
      where: { ...where, status: "ACKNOWLEDGED" },
    });

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      totalHandoffs,
      acknowledgedHandoffs,
      ackRate: totalHandoffs > 0 ? (acknowledgedHandoffs / totalHandoffs) * 100 : 0,
    };
  }
}
