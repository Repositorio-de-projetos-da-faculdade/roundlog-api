// src/modules/patients/patients.service.ts
import { prisma } from "../../shared/prisma.js";
import { ConflictError } from "../../shared/errors.js";
import type { CreatePatientInput } from "./patients.schema.js";

export class PatientsService {
  async createPatient(data: CreatePatientInput, hospitalId: string) {
    const existing = await prisma.patient.findUnique({
      where: { cpf: data.cpf },
    });

    if (existing) {
      throw new ConflictError("CPF já cadastrado");
    }

    return prisma.patient.create({
      data: {
        ...data,
        hospitalId,
      },
    });
  }

  async getPatient(id: string, hospitalId: string) {
    return prisma.patient.findFirstOrThrow({
      where: { id, hospitalId },
      include: {
        admissions: {
          include: { bed: true },
          orderBy: { admittedAt: "desc" },
        },
      },
    });
  }
}
