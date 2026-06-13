// src/modules/admissions/admissions.service.ts
import { prisma } from "../../shared/prisma.js";
import { ConflictError, NotFoundError } from "../../shared/errors.js";
import type {
  CreateAdmissionInput,
  ListAdmissionsInput,
  CreateFamilyContactInput,
} from "./admissions.schema.js";

export class AdmissionsService {
  async createAdmission(data: CreateAdmissionInput, userId: string, hospitalId: string) {
    // Verifica que o leito pertence a uma ala do hospital
    const bed = await prisma.bed.findFirst({
      where: { id: data.bedId, ward: { hospitalId } },
    });
    if (!bed) throw new NotFoundError("Leito");

    if (bed.status !== "AVAILABLE") {
      throw new ConflictError("Leito não está disponível");
    }

    // Verifica que o paciente pertence ao hospital
    const patient = await prisma.patient.findFirst({
      where: { id: data.patientId, hospitalId },
    });
    if (!patient) throw new NotFoundError("Paciente");

    return prisma.$transaction(async (tx) => {
      const admission = await tx.admission.create({
        data: {
          patientId: data.patientId,
          bedId: data.bedId,
          admittedById: userId,
          diagnosis: data.diagnosis,
        },
      });

      await tx.bed.update({
        where: { id: data.bedId },
        data: { status: "OCCUPIED" },
      });

      return admission;
    });
  }

  async discharge(admissionId: string, hospitalId: string) {
    const admission = await prisma.admission.findFirst({
      where: { id: admissionId, bed: { ward: { hospitalId } } },
    });
    if (!admission) throw new NotFoundError("Internação");

    if (admission.status === "DISCHARGED") {
      throw new ConflictError("Internação já foi encerrada");
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.admission.update({
        where: { id: admissionId },
        data: {
          status: "DISCHARGED",
          dischargedAt: new Date(),
        },
      });

      await tx.bed.update({
        where: { id: admission.bedId },
        data: { status: "AVAILABLE" },
      });

      return updated;
    });
  }

  /**
   * Lista internações do hospital com filtros opcionais por status e ala.
   * Retorna admission + patient + bed (com ward).
   */
  async listAdmissions(filters: ListAdmissionsInput, hospitalId: string) {
    const where = {
      ...(filters.status ? { status: filters.status } : {}),
      bed: {
        ward: {
          hospitalId,
          ...(filters.wardId ? { id: filters.wardId } : {}),
        },
      },
    };

    const [total, items] = await prisma.$transaction([
      prisma.admission.count({ where }),
      prisma.admission.findMany({
        where,
        skip: filters.skip,
        take: filters.take,
        orderBy: { admittedAt: "desc" },
        include: {
          patient: { select: { id: true, name: true, cpf: true } },
          bed: {
            select: {
              id: true,
              code: true,
              ward: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    return { total, skip: filters.skip, take: filters.take, items };
  }

  /**
   * Adiciona contato familiar a uma internação.
   * `accessToken` é gerado automaticamente pelo Prisma (cuid).
   * Esse token é usado no portal familiar `/family/patient/:token/*` (sem JWT).
   */
  async addFamilyContact(
    admissionId: string,
    data: CreateFamilyContactInput,
    hospitalId: string,
  ) {
    const admission = await prisma.admission.findFirst({
      where: { id: admissionId, bed: { ward: { hospitalId } } },
      select: { id: true },
    });
    if (!admission) throw new NotFoundError("Internação");

    return prisma.familyContact.create({
      data: {
        admissionId,
        name: data.name,
        relationship: data.relationship,
        phone: data.phone,
      },
    });
  }

  /**
   * Lista as internações ACTIVE relevantes pro usuário logado.
   *
   * Regra (combinada com o front PWA, tela /beds que substitui o boot direto
   * pro /record):
   *  - PHYSICIAN / ADMIN / MANAGER → todas as ACTIVE do hospital
   *  - NURSE / TECHNICIAN          → só as ACTIVE da ward do NursingShift
   *    aberto desse usuário. Se ele não tiver shift aberto, retorna lista
   *    vazia + flag `requiresShift: true` pra UI explicar "abra o plantão".
   *
   * Retorna formato leve (id, paciente, leito, ward, diagnóstico, admittedAt,
   * lastVisitAt) — listagem mobile, sem visits/conducts.
   */
  async listForUser(
    userId: string,
    role: string,
    hospitalId: string,
  ): Promise<{
    items: Array<{
      id: string;
      diagnosis: string | null;
      admittedAt: Date;
      patient: { id: string; name: string };
      bed: { id: string; code: string; ward: { id: string; name: string } };
      lastVisitAt: Date | null;
    }>;
    requiresShift: boolean;
    activeShiftWardId: string | null;
  }> {
    const wardFilter: { id?: string; hospitalId: string } = { hospitalId };
    let requiresShift = false;
    let activeShiftWardId: string | null = null;

    if (role === "NURSE" || role === "TECHNICIAN") {
      const openShift = await prisma.nursingShift.findFirst({
        where: { nurseId: userId, endedAt: null, ward: { hospitalId } },
        orderBy: { startedAt: "desc" },
        select: { wardId: true },
      });
      if (!openShift) {
        return { items: [], requiresShift: true, activeShiftWardId: null };
      }
      wardFilter.id = openShift.wardId;
      activeShiftWardId = openShift.wardId;
    }

    const admissions = await prisma.admission.findMany({
      where: {
        status: "ACTIVE",
        bed: { ward: wardFilter },
      },
      orderBy: { admittedAt: "desc" },
      select: {
        id: true,
        diagnosis: true,
        admittedAt: true,
        patient: { select: { id: true, name: true } },
        bed: {
          select: {
            id: true,
            code: true,
            ward: { select: { id: true, name: true } },
          },
        },
        visits: {
          orderBy: { startedAt: "desc" },
          take: 1,
          select: { startedAt: true },
        },
      },
    });

    return {
      items: admissions.map((a) => ({
        id: a.id,
        diagnosis: a.diagnosis,
        admittedAt: a.admittedAt,
        patient: a.patient,
        bed: a.bed,
        lastVisitAt: a.visits[0]?.startedAt ?? null,
      })),
      requiresShift,
      activeShiftWardId,
    };
  }

  async getAdmission(id: string, hospitalId: string) {
    const admission = await prisma.admission.findFirst({
      where: { id, bed: { ward: { hospitalId } } },
      include: {
        patient: true,
        bed: { include: { ward: true } },
        visits: {
          orderBy: { startedAt: "desc" },
          include: { conducts: true, pendings: true, alerts: true },
        },
        familyContacts: true,
      },
    });
    if (!admission) throw new NotFoundError("Internação");
    return admission;
  }
}
