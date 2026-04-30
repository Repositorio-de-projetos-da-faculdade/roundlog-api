// src/modules/near-misses/near-misses.service.ts
import { prisma } from "../../shared/prisma.js";
import type { CreateNearMissInput } from "./near-misses.schema.js";

export class NearMissesService {
  async create(data: CreateNearMissInput, hospitalId: string) {
    return prisma.nearMiss.create({
      data: { ...data, hospitalId },
    });
  }

  async getSummary(hospitalId: string) {
    const total = await prisma.nearMiss.count({ where: { hospitalId } });
    const byCategory = await prisma.nearMiss.groupBy({
      by: ["category"],
      where: { hospitalId },
      _count: true,
    });
    const bySeverity = await prisma.nearMiss.groupBy({
      by: ["severity"],
      where: { hospitalId },
      _count: true,
    });
    return { total, byCategory, bySeverity };
  }

  async getPatterns(hospitalId: string) {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return prisma.nearMiss.findMany({
      where: { hospitalId, reportedAt: { gte: last30Days } },
      orderBy: { reportedAt: "desc" },
    });
  }
}
