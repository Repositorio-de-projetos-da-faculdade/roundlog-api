// src/modules/analytics/analytics.service.ts
import { prisma } from "../../shared/prisma.js";

export class AnalyticsService {
  async getWardAnalytics(wardId: string, hospitalId: string) {
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

  async getComplianceMetrics(hospitalId: string) {
    const totalConducts = await prisma.conduct.count({
      where: { visit: { admission: { bed: { ward: { hospitalId } } } } },
    });
    const resolvedConducts = await prisma.conduct.count({
      where: { status: "RESOLVED", visit: { admission: { bed: { ward: { hospitalId } } } } },
    });

    return {
      totalConducts,
      resolvedConducts,
      complianceRate: totalConducts > 0 ? (resolvedConducts / totalConducts) * 100 : 0,
    };
  }

  async getHandoffMetrics(hospitalId: string) {
    const totalHandoffs = await prisma.shiftHandoff.count({
      where: { ward: { hospitalId } },
    });
    const acknowledgedHandoffs = await prisma.shiftHandoff.count({
      where: { status: "ACKNOWLEDGED", ward: { hospitalId } },
    });

    return {
      totalHandoffs,
      acknowledgedHandoffs,
      ackRate: totalHandoffs > 0 ? (acknowledgedHandoffs / totalHandoffs) * 100 : 0,
    };
  }
}
