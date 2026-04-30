// src/modules/hospitals/hospitals.service.ts
import { prisma } from "../../shared/prisma.js";
import { ConflictError } from "../../shared/errors.js";
import type { CreateHospitalInput } from "./hospitals.schema.js";

export class HospitalsService {
  async getHospital(hospitalId: string) {
    return prisma.hospital.findUniqueOrThrow({
      where: { id: hospitalId },
      include: { wards: true },
    });
  }

  async createHospital(data: CreateHospitalInput) {
    const existing = await prisma.hospital.findUnique({
      where: { cnpj: data.cnpj },
    });

    if (existing) {
      throw new ConflictError("CNPJ já cadastrado");
    }

    return prisma.hospital.create({ data });
  }
}
