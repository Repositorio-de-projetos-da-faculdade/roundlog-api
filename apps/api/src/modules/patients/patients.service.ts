// src/modules/patients/patients.service.ts
import { prisma } from "../../shared/prisma.js";
import { ConflictError, NotFoundError } from "../../shared/errors.js";
import type { CreatePatientInput, ListPatientsInput } from "./patients.schema.js";

export class PatientsService {
  async createPatient(data: CreatePatientInput, hospitalId: string) {
    const existing = await prisma.patient.findUnique({ where: { cpf: data.cpf } });
    if (existing) throw new ConflictError("CPF já cadastrado");

    return prisma.patient.create({
      data: { ...data, hospitalId },
    });
  }

  async getPatient(id: string, hospitalId: string) {
    const patient = await prisma.patient.findFirst({
      where: { id, hospitalId },
      include: {
        admissions: {
          include: { bed: true },
          orderBy: { admittedAt: "desc" },
        },
      },
    });
    if (!patient) throw new NotFoundError("Paciente");
    return patient;
  }

  /**
   * Lista pacientes do hospital com busca opcional por nome ou CPF.
   * Pagina por skip/take. Retorna lista + total para o cliente paginar.
   */
  async listPatients(filters: ListPatientsInput, hospitalId: string) {
    const where = {
      hospitalId,
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" as const } },
              { cpf: { contains: filters.search } },
            ],
          }
        : {}),
    };

    const [total, items] = await prisma.$transaction([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        orderBy: { createdAt: "desc" },
        include: {
          admissions: {
            where: { status: "ACTIVE" },
            include: { bed: { select: { id: true, code: true, wardId: true } } },
            take: 1,
          },
        },
      }),
    ]);

    return { total, skip: filters.skip, take: filters.take, items };
  }
}
