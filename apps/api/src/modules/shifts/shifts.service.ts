// src/modules/shifts/shifts.service.ts
import { prisma } from "../../shared/prisma.js";
import { ConflictError, NotFoundError } from "../../shared/errors.js";
import type { CreateShiftInput, ListShiftsInput } from "./shifts.schema.js";

export class ShiftsService {
  /**
   * Lista turnos de uma ala do hospital. Se `filters.open` for true,
   * retorna apenas turnos ainda abertos (sem `endedAt`).
   */
  async listByWard(wardId: string, hospitalId: string, filters: ListShiftsInput) {
    const ward = await prisma.ward.findFirst({
      where: { id: wardId, hospitalId },
      select: { id: true },
    });
    if (!ward) throw new NotFoundError("Ala");

    return prisma.nursingShift.findMany({
      where: {
        wardId,
        ...(filters.open ? { endedAt: null } : {}),
      },
      orderBy: { startedAt: "desc" },
      include: {
        nurse: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Abre um novo turno de enfermagem na ala, iniciando agora.
   */
  async create(data: CreateShiftInput, nurseId: string, hospitalId: string) {
    const ward = await prisma.ward.findFirst({
      where: { id: data.wardId, hospitalId },
      select: { id: true },
    });
    if (!ward) throw new NotFoundError("Ala");

    return prisma.nursingShift.create({
      data: {
        wardId: data.wardId,
        nurseId,
        type: data.type,
        startedAt: new Date(),
      },
      include: {
        nurse: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Encerra um turno aberto. Lança ConflictError se já estiver encerrado.
   */
  async close(shiftId: string, hospitalId: string) {
    const shift = await prisma.nursingShift.findFirst({
      where: { id: shiftId, ward: { hospitalId } },
    });
    if (!shift) throw new NotFoundError("Turno");

    if (shift.endedAt) {
      throw new ConflictError("Turno já encerrado");
    }

    return prisma.nursingShift.update({
      where: { id: shiftId },
      data: { endedAt: new Date() },
      include: {
        nurse: { select: { id: true, name: true } },
      },
    });
  }
}
