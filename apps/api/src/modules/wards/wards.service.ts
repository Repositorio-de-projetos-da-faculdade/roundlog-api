// src/modules/wards/wards.service.ts
import { prisma } from "../../shared/prisma.js";
import type { CreateWardInput, CreateBedInput } from "./wards.schema.js";

export class WardsService {
  async createWard(data: CreateWardInput, hospitalId: string) {
    return prisma.ward.create({
      data: {
        ...data,
        hospitalId,
      },
    });
  }

  async listWards(hospitalId: string) {
    return prisma.ward.findMany({
      where: { hospitalId },
      include: { beds: true },
    });
  }

  async createBed(wardId: string, data: CreateBedInput, hospitalId: string) {
    // Verifica que a ala pertence ao hospital do usuário
    await prisma.ward.findFirstOrThrow({
      where: { id: wardId, hospitalId },
    });

    return prisma.bed.create({
      data: {
        wardId,
        code: data.code,
        status: data.status,
      },
    });
  }

  async listBeds(wardId: string, hospitalId: string) {
    await prisma.ward.findFirstOrThrow({
      where: { id: wardId, hospitalId },
    });

    return prisma.bed.findMany({
      where: { wardId },
      include: {
        admissions: {
          where: { status: "ACTIVE" },
          include: { patient: true },
        },
      },
    });
  }
}
