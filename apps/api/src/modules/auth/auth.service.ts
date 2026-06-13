// src/modules/auth/auth.service.ts
import { prisma } from "../../shared/prisma.js";
import { hashPassword, verifyPassword } from "../../shared/utils/hash.js";
import { ConflictError, UnauthorizedError } from "../../shared/errors.js";
import type { RegisterInput, LoginInput } from "./auth.schema.js";

export class AuthService {
  async register(data: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError("E-mail já cadastrado");
    }

    // Garante que o hospital existe — evita FK ruim que confunde o usuário
    const hospital = await prisma.hospital.findUnique({
      where: { id: data.hospitalId },
      select: { id: true },
    });
    if (!hospital) {
      throw new ConflictError("Hospital não encontrado");
    }

    const passwordHash = await hashPassword(data.password);

    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        hospitalId: data.hospitalId,
        crm: data.crm,
        coren: data.coren,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        hospitalId: true,
        createdAt: true,
      },
    });
  }

  async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedError("Credenciais inválidas");
    }

    const passwordValid = await verifyPassword(data.password, user.passwordHash);

    if (!passwordValid) {
      throw new UnauthorizedError("Credenciais inválidas");
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId,
      name: user.name,
    };
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        hospitalId: true,
        name: true,
      },
    });
  }
}
