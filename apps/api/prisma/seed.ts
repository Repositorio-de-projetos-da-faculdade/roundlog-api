// prisma/seed.ts
import { PrismaClient, Role, BedStatus, ShiftType } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. Hospital
  const hospital = await prisma.hospital.create({
    data: {
      name: "Hospital São Lucas - Demo",
      cnpj: "12.345.678/0001-99",
    },
  });
  console.log(`✅ Hospital criado: ${hospital.name}`);

  // 2. Users
  const passwordHash = await hash("123456", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Dr. Admin",
      email: "admin@roundlog.dev",
      passwordHash,
      role: Role.ADMIN,
      hospitalId: hospital.id,
    },
  });

  const physician = await prisma.user.create({
    data: {
      name: "Dr. João Silva",
      email: "joao@roundlog.dev",
      passwordHash,
      role: Role.PHYSICIAN,
      crm: "CRM/SP 123456",
      hospitalId: hospital.id,
    },
  });

  const nurse = await prisma.user.create({
    data: {
      name: "Enf. Maria Santos",
      email: "maria@roundlog.dev",
      passwordHash,
      role: Role.NURSE,
      coren: "COREN/SP 654321",
      hospitalId: hospital.id,
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "Gestor Carlos Oliveira",
      email: "carlos@roundlog.dev",
      passwordHash,
      role: Role.MANAGER,
      hospitalId: hospital.id,
    },
  });

  console.log("✅ Usuários criados (senha para todos: 123456)");

  // 3. Ward + Beds
  const ward = await prisma.ward.create({
    data: {
      hospitalId: hospital.id,
      name: "Ala Clínica A",
      floor: "2º Andar",
      specialty: "Clínica Médica",
    },
  });

  const beds = await Promise.all(
    ["A-201", "A-202", "A-203", "A-204", "A-205", "A-206"].map((code, i) =>
      prisma.bed.create({
        data: {
          wardId: ward.id,
          code,
          status: i < 3 ? BedStatus.OCCUPIED : BedStatus.AVAILABLE,
        },
      })
    )
  );
  console.log(`✅ Ala "${ward.name}" criada com ${beds.length} leitos`);

  // 4. Patients
  const patient1 = await prisma.patient.create({
    data: {
      hospitalId: hospital.id,
      name: "José da Silva",
      dob: new Date("1955-03-15"),
      cpf: "111.222.333-44",
      bloodType: "O+",
      allergies: ["Dipirona", "Penicilina"],
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      hospitalId: hospital.id,
      name: "Ana Maria Souza",
      dob: new Date("1978-07-22"),
      cpf: "555.666.777-88",
      bloodType: "A+",
      allergies: [],
    },
  });

  console.log("✅ Pacientes demo criados");

  // 5. Admissions
  const admission1 = await prisma.admission.create({
    data: {
      patientId: patient1.id,
      bedId: beds[0].id,
      admittedById: physician.id,
      diagnosis: "Pneumonia adquirida na comunidade",
    },
  });

  const admission2 = await prisma.admission.create({
    data: {
      patientId: patient2.id,
      bedId: beds[1].id,
      admittedById: physician.id,
      diagnosis: "ICC descompensada",
    },
  });

  console.log("✅ Internações demo criadas");

  // 6. Family contacts
  await prisma.familyContact.create({
    data: {
      admissionId: admission1.id,
      name: "Maria da Silva",
      relationship: "Esposa",
      phone: "(11) 99999-0001",
    },
  });

  console.log("✅ Contato familiar demo criado");

  // 7. Nursing shift
  await prisma.nursingShift.create({
    data: {
      wardId: ward.id,
      nurseId: nurse.id,
      startedAt: new Date(),
      type: ShiftType.MORNING,
    },
  });

  console.log("✅ Turno de enfermagem demo criado");

  console.log("\n🎉 Seed concluído com sucesso!");
  console.log("📧 Logins disponíveis:");
  console.log("   admin@roundlog.dev    (ADMIN)");
  console.log("   joao@roundlog.dev     (PHYSICIAN)");
  console.log("   maria@roundlog.dev    (NURSE)");
  console.log("   carlos@roundlog.dev   (MANAGER)");
  console.log("   Senha: 123456");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
