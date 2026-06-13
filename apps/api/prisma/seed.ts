// prisma/seed.ts
//
// Seed completo do RoundLog — popula todos os modelos com dados realistas
// para uma demo convincente. Foi pensado pra rodar APÓS um `db push --force-reset`
// (que é o fluxo de dev padrão), então não usa upserts.
//
// Personas principais (senha de todos: 123456):
//   admin@roundlog.dev   ADMIN
//   joao@roundlog.dev    PHYSICIAN (Dr. João — UTI / Clínica)
//   ricardo@roundlog.dev PHYSICIAN (Dr. Ricardo — Pediatria)
//   maria@roundlog.dev   NURSE     (Enf. Maria — usuária de teste do app)
//   beatriz@roundlog.dev NURSE
//   lucas@roundlog.dev   NURSE
//   julia@roundlog.dev   TECHNICIAN
//   carlos@roundlog.dev  MANAGER

import {
  PrismaClient,
  Role,
  BedStatus,
  ShiftType,
  Priority,
  ConductStatus,
  VisitStatus,
  AdmissionStatus,
  HandoffStatus,
} from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

// ─── Helpers ────────────────────────────────────────────────────────────────

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = () => new Date();
const hoursAgo = (h: number) => new Date(Date.now() - h * HOUR);
const daysAgo = (d: number) => new Date(Date.now() - d * DAY);
const minutesAgo = (m: number) => new Date(Date.now() - m * 60 * 1000);

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// ─── Tipos auxiliares (mesmos shapes do gemini.ts) ──────────────────────────

type StructuredVisit = {
  transcript: string;
  conducts: Array<{
    description: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    deadline_hours: number | null;
  }>;
  pendings: Array<{ description: string; assigned_to: string }>;
  alerts: Array<{ type: string; severity: string; description: string }>;
  prescriptions: Array<{
    medication: string;
    dose: string;
    route: string;
    frequency: string;
    duration: string;
  }>;
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("🌱 Seeding database (full demo)...");

  // Limpeza defensiva (caso seed seja rodado sem --force-reset)
  // A ordem respeita as FKs.
  await prisma.notification.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.nearMiss.deleteMany();
  await prisma.familyMessage.deleteMany();
  await prisma.familyUpdate.deleteMany();
  await prisma.handoffAck.deleteMany();
  await prisma.shiftHandoff.deleteMany();
  await prisma.nursingExecution.deleteMany();
  await prisma.nursingShift.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.clinicalAlert.deleteMany();
  await prisma.pending.deleteMany();
  await prisma.conduct.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.familyContact.deleteMany();
  await prisma.admission.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.bed.deleteMany();
  await prisma.ward.deleteMany();
  await prisma.user.deleteMany();
  await prisma.hospital.deleteMany();

  // ─── 1. Hospital ─────────────────────────────────────────────────────────
  const hospital = await prisma.hospital.create({
    data: {
      name: "Hospital São Lucas - Demo",
      cnpj: "12.345.678/0001-99",
    },
  });
  console.log(`✅ Hospital: ${hospital.name}`);

  // ─── 2. Users ────────────────────────────────────────────────────────────
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

  const joao = await prisma.user.create({
    data: {
      name: "Dr. João Silva",
      email: "joao@roundlog.dev",
      passwordHash,
      role: Role.PHYSICIAN,
      crm: "CRM/SP 123456",
      hospitalId: hospital.id,
    },
  });

  const ricardo = await prisma.user.create({
    data: {
      name: "Dr. Ricardo Almeida",
      email: "ricardo@roundlog.dev",
      passwordHash,
      role: Role.PHYSICIAN,
      crm: "CRM/SP 234567",
      hospitalId: hospital.id,
    },
  });

  const maria = await prisma.user.create({
    data: {
      name: "Enf. Maria Santos",
      email: "maria@roundlog.dev",
      passwordHash,
      role: Role.NURSE,
      coren: "COREN/SP 654321",
      hospitalId: hospital.id,
    },
  });

  const beatriz = await prisma.user.create({
    data: {
      name: "Enf. Beatriz Lima",
      email: "beatriz@roundlog.dev",
      passwordHash,
      role: Role.NURSE,
      coren: "COREN/SP 765432",
      hospitalId: hospital.id,
    },
  });

  const lucas = await prisma.user.create({
    data: {
      name: "Enf. Lucas Pereira",
      email: "lucas@roundlog.dev",
      passwordHash,
      role: Role.NURSE,
      coren: "COREN/SP 876543",
      hospitalId: hospital.id,
    },
  });

  const julia = await prisma.user.create({
    data: {
      name: "Téc. Júlia Rodrigues",
      email: "julia@roundlog.dev",
      passwordHash,
      role: Role.TECHNICIAN,
      hospitalId: hospital.id,
    },
  });

  const carlos = await prisma.user.create({
    data: {
      name: "Gestor Carlos Oliveira",
      email: "carlos@roundlog.dev",
      passwordHash,
      role: Role.MANAGER,
      hospitalId: hospital.id,
    },
  });

  console.log("✅ 8 usuários criados (senha: 123456)");

  // ─── 3. Wards ────────────────────────────────────────────────────────────
  const wardUti = await prisma.ward.create({
    data: {
      hospitalId: hospital.id,
      name: "UTI Adulto",
      floor: "3º Andar",
      specialty: "Terapia Intensiva",
    },
  });

  const wardClinica = await prisma.ward.create({
    data: {
      hospitalId: hospital.id,
      name: "Clínica Médica",
      floor: "2º Andar",
      specialty: "Clínica Médica",
    },
  });

  const wardPed = await prisma.ward.create({
    data: {
      hospitalId: hospital.id,
      name: "Pediatria",
      floor: "4º Andar",
      specialty: "Pediatria",
    },
  });

  console.log("✅ 3 alas criadas");

  // ─── 4. Beds ─────────────────────────────────────────────────────────────
  // 7 leitos por ala = 21 leitos. Mistura de status.
  const bedSpecs: Array<{
    ward: typeof wardUti;
    code: string;
    status: BedStatus;
  }> = [];

  // UTI: 7 leitos (5 ocupados, 1 disponível, 1 manutenção)
  ["UTI-01", "UTI-02", "UTI-03", "UTI-04", "UTI-05"].forEach((code) =>
    bedSpecs.push({ ward: wardUti, code, status: BedStatus.OCCUPIED }),
  );
  bedSpecs.push({ ward: wardUti, code: "UTI-06", status: BedStatus.AVAILABLE });
  bedSpecs.push({ ward: wardUti, code: "UTI-07", status: BedStatus.MAINTENANCE });

  // Clínica: 8 leitos (5 ocupados, 3 disponíveis)
  ["CM-201", "CM-202", "CM-203", "CM-204", "CM-205"].forEach((code) =>
    bedSpecs.push({ ward: wardClinica, code, status: BedStatus.OCCUPIED }),
  );
  ["CM-206", "CM-207", "CM-208"].forEach((code) =>
    bedSpecs.push({ ward: wardClinica, code, status: BedStatus.AVAILABLE }),
  );

  // Pediatria: 6 leitos (2 ocupados, 3 disponíveis, 1 manutenção)
  ["PED-401", "PED-402"].forEach((code) =>
    bedSpecs.push({ ward: wardPed, code, status: BedStatus.OCCUPIED }),
  );
  ["PED-403", "PED-404", "PED-405"].forEach((code) =>
    bedSpecs.push({ ward: wardPed, code, status: BedStatus.AVAILABLE }),
  );
  bedSpecs.push({ ward: wardPed, code: "PED-406", status: BedStatus.MAINTENANCE });

  const beds = await Promise.all(
    bedSpecs.map((spec) =>
      prisma.bed.create({
        data: { wardId: spec.ward.id, code: spec.code, status: spec.status },
      }),
    ),
  );
  console.log(`✅ ${beds.length} leitos criados`);

  // Lookup helpers
  const bedByCode = (code: string) => beds.find((b) => b.code === code)!;

  // ─── 5. Patients ─────────────────────────────────────────────────────────
  const patientsData: Array<{
    name: string;
    dob: Date;
    cpf: string;
    bloodType: string;
    allergies: string[];
  }> = [
    { name: "José da Silva",         dob: new Date("1955-03-15"), cpf: "11122233344", bloodType: "O+",  allergies: ["Dipirona", "Penicilina"] },
    { name: "Ana Maria Souza",       dob: new Date("1962-07-22"), cpf: "22233344455", bloodType: "A+",  allergies: ["AAS"] },
    { name: "Carlos Eduardo Pereira", dob: new Date("1948-11-04"), cpf: "33344455566", bloodType: "B+",  allergies: [] },
    { name: "Beatriz Andrade",       dob: new Date("1975-05-30"), cpf: "44455566677", bloodType: "AB+", allergies: ["Iodo"] },
    { name: "Pedro Henrique Lima",   dob: new Date("1939-02-18"), cpf: "55566677788", bloodType: "O-",  allergies: ["Sulfa", "Látex"] },
    { name: "Mariana Costa",         dob: new Date("1988-09-12"), cpf: "66677788899", bloodType: "A-",  allergies: [] },
    { name: "Roberto Nascimento",    dob: new Date("1957-12-08"), cpf: "77788899900", bloodType: "O+",  allergies: ["Penicilina"] },
    { name: "Cláudia Ferreira",      dob: new Date("1968-04-25"), cpf: "88899900011", bloodType: "B-",  allergies: [] },
    { name: "Sofia Almeida",         dob: new Date("2018-06-10"), cpf: "99900011122", bloodType: "A+",  allergies: ["Amoxicilina"] },
    { name: "Gabriel Oliveira",      dob: new Date("2015-01-22"), cpf: "10011122233", bloodType: "O+",  allergies: [] },
  ];

  const patients = await Promise.all(
    patientsData.map((p) =>
      prisma.patient.create({ data: { hospitalId: hospital.id, ...p } }),
    ),
  );
  console.log(`✅ ${patients.length} pacientes criados`);

  const patientByName = (name: string) => patients.find((p) => p.name === name)!;

  // ─── 6. Admissions ───────────────────────────────────────────────────────
  // 7 ACTIVE (cobrindo os leitos OCCUPIED) + 3 DISCHARGED (passado)
  // Mapeamento bed → patient + diagnóstico

  const admissionSpecs: Array<{
    bedCode: string;
    patient: string;
    diagnosis: string;
    admittedBy: string;
    admittedAt: Date;
    status: AdmissionStatus;
    dischargedAt?: Date;
  }> = [
    // ACTIVE — UTI (graves)
    { bedCode: "UTI-01", patient: "José da Silva",          diagnosis: "Pneumonia grave + sepse pulmonar",     admittedBy: joao.id,    admittedAt: daysAgo(5),  status: AdmissionStatus.ACTIVE },
    { bedCode: "UTI-02", patient: "Pedro Henrique Lima",    diagnosis: "AVC isquêmico em território de ACM",   admittedBy: joao.id,    admittedAt: daysAgo(3),  status: AdmissionStatus.ACTIVE },
    { bedCode: "UTI-03", patient: "Carlos Eduardo Pereira", diagnosis: "Infarto agudo do miocárdio (IAM)",      admittedBy: joao.id,    admittedAt: daysAgo(2),  status: AdmissionStatus.ACTIVE },
    { bedCode: "UTI-04", patient: "Roberto Nascimento",     diagnosis: "Pancreatite aguda grave",               admittedBy: joao.id,    admittedAt: daysAgo(4),  status: AdmissionStatus.ACTIVE },
    { bedCode: "UTI-05", patient: "Cláudia Ferreira",       diagnosis: "Choque séptico de foco abdominal",      admittedBy: joao.id,    admittedAt: daysAgo(1),  status: AdmissionStatus.ACTIVE },

    // ACTIVE — Clínica
    { bedCode: "CM-201", patient: "Ana Maria Souza",        diagnosis: "ICC descompensada",                     admittedBy: joao.id,    admittedAt: daysAgo(6),  status: AdmissionStatus.ACTIVE },
    { bedCode: "CM-202", patient: "Beatriz Andrade",        diagnosis: "Crise hipertensiva",                    admittedBy: joao.id,    admittedAt: daysAgo(2),  status: AdmissionStatus.ACTIVE },
    { bedCode: "CM-203", patient: "Mariana Costa",          diagnosis: "Pielonefrite aguda",                    admittedBy: joao.id,    admittedAt: daysAgo(3),  status: AdmissionStatus.ACTIVE },

    // ACTIVE — Pediatria
    { bedCode: "PED-401", patient: "Sofia Almeida",         diagnosis: "Bronquiolite viral aguda",              admittedBy: ricardo.id, admittedAt: daysAgo(2),  status: AdmissionStatus.ACTIVE },
    { bedCode: "PED-402", patient: "Gabriel Oliveira",      diagnosis: "Gastroenterite com desidratação",       admittedBy: ricardo.id, admittedAt: daysAgo(1),  status: AdmissionStatus.ACTIVE },
  ];

  const admissions = await Promise.all(
    admissionSpecs.map((spec) =>
      prisma.admission.create({
        data: {
          patientId: patientByName(spec.patient).id,
          bedId: bedByCode(spec.bedCode).id,
          admittedById: spec.admittedBy,
          admittedAt: spec.admittedAt,
          dischargedAt: spec.dischargedAt,
          diagnosis: spec.diagnosis,
          status: spec.status,
        },
      }),
    ),
  );

  // Algumas internações já encerradas (sem ocupar leitos atuais).
  // Reaproveitamos pacientes já existentes pra que tenham histórico.
  const dischargedSpecs = [
    { patient: "Mariana Costa",       bedCode: "CM-206", diagnosis: "Infecção urinária",         admittedAt: daysAgo(30), dischargedAt: daysAgo(25) },
    { patient: "Beatriz Andrade",     bedCode: "CM-207", diagnosis: "Enxaqueca refratária",      admittedAt: daysAgo(45), dischargedAt: daysAgo(43) },
    { patient: "Carlos Eduardo Pereira", bedCode: "CM-208", diagnosis: "DPOC exacerbada",         admittedAt: daysAgo(60), dischargedAt: daysAgo(55) },
  ];
  const dischargedAdmissions = await Promise.all(
    dischargedSpecs.map((spec) =>
      prisma.admission.create({
        data: {
          patientId: patientByName(spec.patient).id,
          bedId: bedByCode(spec.bedCode).id,
          admittedById: joao.id,
          admittedAt: spec.admittedAt,
          dischargedAt: spec.dischargedAt,
          diagnosis: spec.diagnosis,
          status: AdmissionStatus.DISCHARGED,
        },
      }),
    ),
  );

  console.log(
    `✅ ${admissions.length} internações ACTIVE + ${dischargedAdmissions.length} DISCHARGED`,
  );

  const admByPatient = (name: string) =>
    admissions.find((a) => a.patientId === patientByName(name).id)!;

  // ─── 7. FamilyContacts ───────────────────────────────────────────────────
  const familyContacts = await Promise.all([
    prisma.familyContact.create({
      data: {
        admissionId: admByPatient("José da Silva").id,
        name: "Maria da Silva",
        relationship: "Esposa",
        phone: "(11) 99999-0001",
      },
    }),
    prisma.familyContact.create({
      data: {
        admissionId: admByPatient("José da Silva").id,
        name: "Paulo da Silva",
        relationship: "Filho",
        phone: "(11) 99999-0002",
      },
    }),
    prisma.familyContact.create({
      data: {
        admissionId: admByPatient("Ana Maria Souza").id,
        name: "Pedro Souza",
        relationship: "Filho",
        phone: "(11) 98888-0001",
      },
    }),
    prisma.familyContact.create({
      data: {
        admissionId: admByPatient("Pedro Henrique Lima").id,
        name: "Helena Lima",
        relationship: "Filha",
        phone: "(11) 97777-0001",
      },
    }),
    prisma.familyContact.create({
      data: {
        admissionId: admByPatient("Sofia Almeida").id,
        name: "Juliana Almeida",
        relationship: "Mãe",
        phone: "(11) 96666-0001",
      },
    }),
    prisma.familyContact.create({
      data: {
        admissionId: admByPatient("Sofia Almeida").id,
        name: "Rafael Almeida",
        relationship: "Pai",
        phone: "(11) 96666-0002",
      },
    }),
  ]);
  console.log(`✅ ${familyContacts.length} contatos familiares criados`);

  // ─── 8. Visits + dados estruturados ──────────────────────────────────────
  // Função helper pra criar visit READY com structuredJson realista + relações
  type VisitBlueprint = {
    admPatient: string;
    physician: string;
    startedHoursAgo: number;
    structured: StructuredVisit;
    transcriptRaw?: string;
  };

  function bp(
    admPatient: string,
    physician: string,
    startedHoursAgo: number,
    structured: StructuredVisit,
  ): VisitBlueprint {
    return { admPatient, physician, startedHoursAgo, structured };
  }

  // Helpers de shape
  const C = (
    description: string,
    priority: StructuredVisit["conducts"][number]["priority"],
    deadline_hours: number | null,
  ) => ({ description, priority, deadline_hours });
  const P = (description: string, assigned_to: string) => ({ description, assigned_to });
  const A = (type: string, severity: string, description: string) => ({ type, severity, description });
  const Rx = (medication: string, dose: string, route: string, frequency: string, duration: string) => ({
    medication, dose, route, frequency, duration,
  });

  const visitBlueprints: VisitBlueprint[] = [
    // José da Silva — UTI, Pneumonia + sepse
    bp("José da Silva", joao.id, 4, {
      transcript:
        "Paciente Sr. José, 70 anos, internado por pneumonia comunitária com sepse pulmonar. " +
        "Hoje observamos melhora da saturação para 94% em cateter nasal. Mantém febre baixa. " +
        "Vamos manter Ceftriaxona, solicitar nova gasometria e iniciar fisioterapia respiratória.",
      conducts: [
        C("Manter Ceftriaxona 1g EV 12/12h", "HIGH", 12),
        C("Solicitar gasometria arterial de controle", "MEDIUM", 4),
        C("Iniciar fisioterapia respiratória 2x/dia", "MEDIUM", 24),
        C("Manter cabeceira elevada a 45°", "LOW", null),
      ],
      pendings: [
        P("Hemograma + PCR pela manhã", "lab"),
        P("Raio-X de tórax controle", "radiology"),
      ],
      alerts: [
        A("allergy", "warning", "Paciente alérgico a Dipirona e Penicilina — verificar prescrições"),
      ],
      prescriptions: [
        Rx("Ceftriaxona", "1g", "iv", "12/12h", "7 dias"),
        Rx("Paracetamol", "750mg", "oral", "6/6h se febre", "uso contínuo"),
        Rx("Enoxaparina", "40mg", "sc", "1x ao dia", "uso contínuo"),
      ],
    }),

    // Pedro Henrique Lima — UTI, AVC
    bp("Pedro Henrique Lima", joao.id, 8, {
      transcript:
        "Paciente Sr. Pedro, 86 anos, em D3 de AVC isquêmico. Hemiparesia direita persiste. " +
        "PA controlada. Iniciamos plano de reabilitação precoce e profilaxia de TVP.",
      conducts: [
        C("Avaliação da equipe de fisioterapia motora", "HIGH", 6),
        C("Manter AAS 100mg/dia", "MEDIUM", null),
        C("Reavaliar deglutição antes da próxima dieta", "CRITICAL", 2),
      ],
      pendings: [
        P("Doppler de carótidas", "radiology"),
        P("Avaliação fonoaudiológica", "nursing"),
      ],
      alerts: [
        A("fall_risk", "critical", "Risco alto de queda — hemiparesia. Manter grades elevadas e supervisão"),
        A("allergy", "warning", "Alérgico a Sulfa e Látex"),
      ],
      prescriptions: [
        Rx("AAS", "100mg", "oral", "1x ao dia", "uso contínuo"),
        Rx("Atorvastatina", "40mg", "oral", "1x ao dia à noite", "uso contínuo"),
        Rx("Losartana", "50mg", "oral", "12/12h", "uso contínuo"),
      ],
    }),

    // Carlos Eduardo — UTI, IAM
    bp("Carlos Eduardo Pereira", joao.id, 6, {
      transcript:
        "Sr. Carlos, 78 anos, D2 pós-IAM. Hemodinamicamente estável. Sem dor precordial nas últimas 24h. " +
        "Mantém dupla antiagregação e estatina em dose alta.",
      conducts: [
        C("Solicitar ECG seriado a cada 6h nas próximas 24h", "HIGH", 6),
        C("Manter monitorização cardíaca contínua", "CRITICAL", null),
        C("Dieta hipossódica e hipogordurosa", "MEDIUM", null),
      ],
      pendings: [
        P("Troponina T de controle 6/6h", "lab"),
        P("Ecocardiograma transtorácico", "radiology"),
      ],
      alerts: [
        A("critical_value", "critical", "Troponina ainda elevada — repetir em 6h"),
      ],
      prescriptions: [
        Rx("AAS", "100mg", "oral", "1x ao dia", "uso contínuo"),
        Rx("Clopidogrel", "75mg", "oral", "1x ao dia", "12 meses"),
        Rx("Atorvastatina", "80mg", "oral", "1x ao dia", "uso contínuo"),
        Rx("Metoprolol", "25mg", "oral", "12/12h", "uso contínuo"),
      ],
    }),

    // Roberto Nascimento — UTI, Pancreatite
    bp("Roberto Nascimento", joao.id, 2, {
      transcript:
        "Sr. Roberto, 68 anos, em D4 de pancreatite aguda grave. Dor abdominal melhorou. " +
        "Amilase e lipase em queda. Reiniciamos dieta oral líquida.",
      conducts: [
        C("Progredir dieta para pastosa nas próximas 24h", "MEDIUM", 24),
        C("Monitorar glicemia capilar 6/6h", "HIGH", 6),
        C("Controle de diurese a cada 4h", "MEDIUM", 4),
      ],
      pendings: [
        P("Amilase e lipase de controle pela manhã", "lab"),
        P("USG de abdome total", "radiology"),
      ],
      alerts: [
        A("allergy", "warning", "Alérgico a Penicilina"),
      ],
      prescriptions: [
        Rx("Omeprazol", "40mg", "iv", "1x ao dia", "5 dias"),
        Rx("Dipirona", "1g", "iv", "6/6h se dor", "uso contínuo"),
      ],
    }),

    // Cláudia Ferreira — UTI, Choque séptico
    bp("Cláudia Ferreira", joao.id, 1, {
      transcript:
        "Sra. Cláudia, 58 anos, admitida há 24h em choque séptico de foco abdominal. " +
        "Em uso de noradrenalina em desmame. Lactato em queda.",
      conducts: [
        C("Desmame de noradrenalina conforme PA", "CRITICAL", 2),
        C("Manter antibioticoterapia de amplo espectro", "CRITICAL", null),
        C("Coleta de novas hemoculturas se febre", "HIGH", null),
      ],
      pendings: [
        P("Lactato sérico de controle 4/4h", "lab"),
        P("TC de abdome com contraste", "radiology"),
        P("Iniciar profilaxia de úlcera de estresse", "pharmacy"),
      ],
      alerts: [
        A("critical_value", "critical", "Lactato 3.8 mmol/L — manter ressuscitação volêmica"),
        A("drug_interaction", "warning", "Atenção: noradrenalina + propofol — monitorar PA"),
      ],
      prescriptions: [
        Rx("Noradrenalina", "0.1 mcg/kg/min", "iv", "infusão contínua", "conforme PA"),
        Rx("Meropenem", "1g", "iv", "8/8h", "10 dias"),
        Rx("Hidrocortisona", "50mg", "iv", "6/6h", "5 dias"),
      ],
    }),

    // Ana Maria Souza — Clínica, ICC
    bp("Ana Maria Souza", joao.id, 24, {
      transcript:
        "Sra. Ana, 63 anos, em D6 de ICC descompensada. Edema de MMII reduziu. " +
        "Boa resposta ao diurético. Mantém dispneia leve aos esforços.",
      conducts: [
        C("Pesar paciente diariamente em jejum", "MEDIUM", 24),
        C("Controle rigoroso de diurese 24h", "HIGH", null),
        C("Ajustar Furosemida conforme balanço", "MEDIUM", 12),
      ],
      pendings: [
        P("BNP e creatinina de controle", "lab"),
      ],
      alerts: [
        A("allergy", "info", "Alérgica a AAS — usar Clopidogrel se necessário"),
      ],
      prescriptions: [
        Rx("Furosemida", "40mg", "iv", "12/12h", "ajustar"),
        Rx("Espironolactona", "25mg", "oral", "1x ao dia", "uso contínuo"),
        Rx("Carvedilol", "12.5mg", "oral", "12/12h", "uso contínuo"),
        Rx("Enalapril", "10mg", "oral", "12/12h", "uso contínuo"),
      ],
    }),

    // Beatriz Andrade — Clínica, Crise HAS
    bp("Beatriz Andrade", joao.id, 12, {
      transcript:
        "Sra. Beatriz, 50 anos, admitida por crise hipertensiva (PA 220x130). " +
        "Após ajuste medicamentoso, PA atual 160x90. Sem sintomas neurológicos.",
      conducts: [
        C("Aferição de PA a cada 2h nas próximas 12h", "HIGH", 2),
        C("Manter dieta hipossódica", "MEDIUM", null),
      ],
      pendings: [
        P("Fundo de olho pela oftalmologia", "nursing"),
        P("Ureia, creatinina e eletrólitos", "lab"),
      ],
      alerts: [],
      prescriptions: [
        Rx("Losartana", "100mg", "oral", "12/12h", "uso contínuo"),
        Rx("Anlodipino", "10mg", "oral", "1x ao dia", "uso contínuo"),
        Rx("Hidroclorotiazida", "25mg", "oral", "1x ao dia pela manhã", "uso contínuo"),
      ],
    }),

    // Mariana Costa — Clínica, Pielonefrite
    bp("Mariana Costa", joao.id, 18, {
      transcript:
        "Sra. Mariana, 37 anos, em D3 de pielonefrite aguda. Febre cedeu nas últimas 12h. " +
        "Boa resposta clínica e laboratorial ao antibiótico.",
      conducts: [
        C("Manter Ceftriaxona até completar 7 dias", "MEDIUM", null),
        C("Hidratação venosa 2000ml/24h", "MEDIUM", 24),
      ],
      pendings: [
        P("Urocultura de controle ao fim do tratamento", "lab"),
      ],
      alerts: [],
      prescriptions: [
        Rx("Ceftriaxona", "1g", "iv", "1x ao dia", "7 dias"),
        Rx("Dipirona", "1g", "iv", "6/6h se febre", "uso contínuo"),
      ],
    }),

    // Sofia Almeida — Pediatria, Bronquiolite
    bp("Sofia Almeida", ricardo.id, 30, {
      transcript:
        "Sofia, 7 anos, em D2 de bronquiolite viral. Tiragem subcostal leve. " +
        "Saturação 95% em ar ambiente após inalação.",
      conducts: [
        C("Inalação com soro fisiológico 4/4h", "MEDIUM", 4),
        C("Monitorar saturação contínua", "HIGH", null),
        C("Manter cabeceira elevada", "LOW", null),
      ],
      pendings: [
        P("Painel viral respiratório", "lab"),
      ],
      alerts: [
        A("allergy", "warning", "Alérgica a Amoxicilina — não prescrever"),
      ],
      prescriptions: [
        Rx("Soro fisiológico 0.9%", "5ml", "inalatório", "4/4h", "uso contínuo"),
      ],
    }),

    // Gabriel Oliveira — Pediatria, Gastroenterite (PROCESSING - sem structured)
    // tratado abaixo separadamente.
  ];

  // Cria as visits READY
  const visits = await Promise.all(
    visitBlueprints.map(async (b) => {
      const adm = admByPatient(b.admPatient);
      return prisma.visit.create({
        data: {
          admissionId: adm.id,
          physicianId: b.physician,
          startedAt: hoursAgo(b.startedHoursAgo),
          finishedAt: hoursAgo(b.startedHoursAgo - 0.3),
          status: VisitStatus.READY,
          audioUrl: `/uploads/audio/demo-visit-${b.admPatient.split(" ")[0]?.toLowerCase()}.webm`,
          transcriptRaw: b.structured.transcript,
          structuredJson: b.structured as any,
        },
      });
    }),
  );

  // Visit extra: PROCESSING (Gabriel)
  const visitProcessing = await prisma.visit.create({
    data: {
      admissionId: admByPatient("Gabriel Oliveira").id,
      physicianId: ricardo.id,
      startedAt: minutesAgo(8),
      status: VisitStatus.PROCESSING,
      audioUrl: "/uploads/audio/demo-visit-gabriel-processing.webm",
    },
  });

  // Visit extra: PROCESSING (Cláudia — segunda visita hoje)
  const visitProcessing2 = await prisma.visit.create({
    data: {
      admissionId: admByPatient("Cláudia Ferreira").id,
      physicianId: joao.id,
      startedAt: minutesAgo(3),
      status: VisitStatus.PROCESSING,
      audioUrl: "/uploads/audio/demo-visit-claudia-proc.webm",
    },
  });

  // Visit extra: ERROR
  const visitError = await prisma.visit.create({
    data: {
      admissionId: admByPatient("Ana Maria Souza").id,
      physicianId: joao.id,
      startedAt: hoursAgo(36),
      finishedAt: hoursAgo(35.5),
      status: VisitStatus.ERROR,
      audioUrl: "/uploads/audio/demo-visit-ana-error.webm",
      transcriptRaw: null,
    },
  });

  // Visits READY antigas (passado) pra alimentar timeline em vários pontos
  const oldVisits = await Promise.all([
    prisma.visit.create({
      data: {
        admissionId: admByPatient("José da Silva").id,
        physicianId: joao.id,
        startedAt: daysAgo(2),
        finishedAt: new Date(daysAgo(2).getTime() + 15 * 60 * 1000),
        status: VisitStatus.READY,
        transcriptRaw: "Visita de admissão. Paciente com pneumonia, iniciado antibiótico EV.",
        structuredJson: {
          transcript: "Visita de admissão. Paciente com pneumonia, iniciado antibiótico EV.",
          conducts: [],
          pendings: [],
          alerts: [],
          prescriptions: [],
        } as any,
      },
    }),
    prisma.visit.create({
      data: {
        admissionId: admByPatient("Ana Maria Souza").id,
        physicianId: joao.id,
        startedAt: daysAgo(5),
        finishedAt: new Date(daysAgo(5).getTime() + 12 * 60 * 1000),
        status: VisitStatus.READY,
        transcriptRaw: "Visita inicial — ICC, iniciado diurético EV.",
        structuredJson: {
          transcript: "Visita inicial — ICC, iniciado diurético EV.",
          conducts: [],
          pendings: [],
          alerts: [],
          prescriptions: [],
        } as any,
      },
    }),
    prisma.visit.create({
      data: {
        admissionId: admByPatient("Sofia Almeida").id,
        physicianId: ricardo.id,
        startedAt: daysAgo(1),
        finishedAt: new Date(daysAgo(1).getTime() + 8 * 60 * 1000),
        status: VisitStatus.READY,
        transcriptRaw: "Reavaliação Sofia — bronquiolite estável, mantém conduta.",
        structuredJson: {
          transcript: "Reavaliação Sofia — bronquiolite estável, mantém conduta.",
          conducts: [],
          pendings: [],
          alerts: [],
          prescriptions: [],
        } as any,
      },
    }),
  ]);

  const allVisits = [...visits, visitProcessing, visitProcessing2, visitError, ...oldVisits];
  console.log(
    `✅ ${allVisits.length} visitas criadas (${visits.length} READY com structured, 2 PROCESSING, 1 ERROR, ${oldVisits.length} READY antigas)`,
  );

  // ─── 9. Conducts (a partir dos blueprints READY) ─────────────────────────
  // Vamos popular Conduct/Pending/Alert/Prescription a partir do structuredJson
  // mas em cima das tabelas relacionais, com variação de status/priority/deadline.

  const allConducts: Awaited<ReturnType<typeof prisma.conduct.create>>[] = [];
  const allPendings: Awaited<ReturnType<typeof prisma.pending.create>>[] = [];
  const allAlerts: Awaited<ReturnType<typeof prisma.clinicalAlert.create>>[] = [];
  const allPrescriptions: Awaited<ReturnType<typeof prisma.prescription.create>>[] = [];

  const priorityMap: Record<string, Priority> = {
    LOW: Priority.LOW,
    MEDIUM: Priority.MEDIUM,
    HIGH: Priority.HIGH,
    CRITICAL: Priority.CRITICAL,
  };

  for (let i = 0; i < visits.length; i++) {
    const visit = visits[i]!;
    const blueprint = visitBlueprints[i]!;

    // ─── Conducts
    for (let j = 0; j < blueprint.structured.conducts.length; j++) {
      const c = blueprint.structured.conducts[j]!;
      // Sortear status: ~60% OPEN, 25% IN_PROGRESS, 15% RESOLVED
      const r = Math.random();
      let status: ConductStatus = ConductStatus.OPEN;
      let resolvedById: string | undefined;
      let resolvedAt: Date | undefined;
      if (r < 0.15) {
        status = ConductStatus.RESOLVED;
        resolvedById = pick([maria.id, beatriz.id, lucas.id]);
        resolvedAt = hoursAgo(Math.random() * blueprint.startedHoursAgo);
      } else if (r < 0.4) {
        status = ConductStatus.IN_PROGRESS;
      }
      // Algumas com deadline já vencido (overdue) pra alimentar o sino
      let deadlineAt: Date | null = null;
      if (c.deadline_hours !== null) {
        // 30% chance de ser overdue (deadline no passado)
        const overdue = Math.random() < 0.3 && status !== ConductStatus.RESOLVED;
        deadlineAt = overdue
          ? hoursAgo(c.deadline_hours)
          : new Date(Date.now() + c.deadline_hours * HOUR);
      }

      const created = await prisma.conduct.create({
        data: {
          visitId: visit.id,
          description: c.description,
          priority: priorityMap[c.priority]!,
          status,
          deadlineAt,
          resolvedById,
          resolvedAt,
        },
      });
      allConducts.push(created);
    }

    // ─── Pendings
    for (const p of blueprint.structured.pendings) {
      const status: ConductStatus = Math.random() < 0.3 ? ConductStatus.RESOLVED : ConductStatus.OPEN;
      const created = await prisma.pending.create({
        data: {
          visitId: visit.id,
          description: p.description,
          assignedToRole: p.assigned_to,
          status,
          resolvedById: status === ConductStatus.RESOLVED ? pick([maria.id, beatriz.id, julia.id]) : undefined,
          resolvedAt: status === ConductStatus.RESOLVED ? hoursAgo(1) : undefined,
        },
      });
      allPendings.push(created);
    }

    // ─── Alerts
    for (const a of blueprint.structured.alerts) {
      const ack = Math.random() < 0.4;
      const created = await prisma.clinicalAlert.create({
        data: {
          visitId: visit.id,
          type: a.type,
          severity: a.severity,
          description: a.description,
          acknowledgedById: ack ? pick([maria.id, beatriz.id, joao.id]) : undefined,
          acknowledgedAt: ack ? hoursAgo(Math.random() * 6) : undefined,
        },
      });
      allAlerts.push(created);
    }

    // ─── Prescriptions
    for (const rx of blueprint.structured.prescriptions) {
      const created = await prisma.prescription.create({
        data: {
          visitId: visit.id,
          medication: rx.medication,
          dose: rx.dose,
          route: rx.route,
          frequency: rx.frequency,
          duration: rx.duration,
        },
      });
      allPrescriptions.push(created);
    }
  }

  console.log(`✅ ${allConducts.length} condutas, ${allPendings.length} pendências, ${allAlerts.length} alertas, ${allPrescriptions.length} prescrições`);

  // ─── 10. NursingShifts ───────────────────────────────────────────────────
  // Pra cada ala: 1 turno aberto MORNING atual + 1-2 fechados anteriores
  const shifts = {
    utiMorningOpen: await prisma.nursingShift.create({
      data: {
        wardId: wardUti.id,
        nurseId: maria.id,
        startedAt: hoursAgo(4),
        endedAt: null,
        type: ShiftType.MORNING,
      },
    }),
    utiNightClosed: await prisma.nursingShift.create({
      data: {
        wardId: wardUti.id,
        nurseId: lucas.id,
        startedAt: hoursAgo(16),
        endedAt: hoursAgo(4),
        type: ShiftType.NIGHT,
      },
    }),
    utiAfternoonClosed: await prisma.nursingShift.create({
      data: {
        wardId: wardUti.id,
        nurseId: beatriz.id,
        startedAt: hoursAgo(24),
        endedAt: hoursAgo(16),
        type: ShiftType.AFTERNOON,
      },
    }),
    clinicaMorningOpen: await prisma.nursingShift.create({
      data: {
        wardId: wardClinica.id,
        nurseId: beatriz.id,
        startedAt: hoursAgo(4),
        endedAt: null,
        type: ShiftType.MORNING,
      },
    }),
    clinicaNightClosed: await prisma.nursingShift.create({
      data: {
        wardId: wardClinica.id,
        nurseId: lucas.id,
        startedAt: hoursAgo(16),
        endedAt: hoursAgo(4),
        type: ShiftType.NIGHT,
      },
    }),
    pedMorningOpen: await prisma.nursingShift.create({
      data: {
        wardId: wardPed.id,
        nurseId: lucas.id,
        startedAt: hoursAgo(4),
        endedAt: null,
        type: ShiftType.MORNING,
      },
    }),
    pedNightClosed: await prisma.nursingShift.create({
      data: {
        wardId: wardPed.id,
        nurseId: maria.id,
        startedAt: hoursAgo(16),
        endedAt: hoursAgo(4),
        type: ShiftType.NIGHT,
      },
    }),
  };
  const allShifts = Object.values(shifts);
  console.log(`✅ ${allShifts.length} turnos de enfermagem criados (3 abertos + 4 fechados)`);

  // ─── 11. NursingExecutions ───────────────────────────────────────────────
  // Pegar algumas conducts e marcar como executadas
  const conductSubset = allConducts.slice(0, 12);
  const executions = await Promise.all(
    conductSubset.map((c, idx) => {
      const shift = pick(allShifts);
      const status = Math.random() < 0.8 ? "done" : "partial";
      return prisma.nursingExecution.create({
        data: {
          conductId: c.id,
          shiftId: shift.id,
          nurseId: shift.nurseId,
          executedAt: hoursAgo(Math.random() * 8),
          status,
          notes:
            status === "done"
              ? pick([
                  "Executado conforme prescrito",
                  "Paciente tolerou bem o procedimento",
                  "Sem intercorrências",
                  "Realizado e checado",
                ])
              : "Executado parcialmente — paciente apresentou desconforto leve",
        },
      });
    }),
  );
  console.log(`✅ ${executions.length} execuções de enfermagem criadas`);

  // ─── 12. ShiftHandoffs ───────────────────────────────────────────────────
  // Helper pra montar summaryJson com base nos pacientes da ala
  function buildHandoffSummary(wardName: string, shiftType: string, admPatients: string[]) {
    return {
      text:
        `Passagem de plantão — ${wardName} (${shiftType}).\n\n` +
        admPatients
          .map((p) => `• ${p}: paciente estável, manter condutas prescritas.`)
          .join("\n") +
        "\n\nFique atento(a) a alterações de sinais vitais e novos sintomas.",
      data: {
        wardName,
        shiftType,
        patients: admPatients.map((name) => {
          const adm = admByPatient(name);
          return {
            name,
            bed: beds.find((b) => b.id === adm.bedId)?.code ?? "?",
            diagnosis: adm.diagnosis ?? "Sem diagnóstico",
            openConducts: allConducts
              .filter(
                (c) =>
                  c.status !== ConductStatus.RESOLVED &&
                  allVisits.find((v) => v.id === c.visitId)?.admissionId === adm.id,
              )
              .map((c) => c.description)
              .slice(0, 3),
            alerts: allAlerts
              .filter(
                (a) =>
                  !a.acknowledgedAt &&
                  allVisits.find((v) => v.id === a.visitId)?.admissionId === adm.id,
              )
              .map((a) => a.description)
              .slice(0, 2),
          };
        }),
      },
    };
  }

  // UTI: passagem noite → manhã (ACKNOWLEDGED)
  const handoffUti = await prisma.shiftHandoff.create({
    data: {
      wardId: wardUti.id,
      fromShiftId: shifts.utiNightClosed.id,
      toShiftId: shifts.utiMorningOpen.id,
      generatedAt: hoursAgo(4),
      summaryJson: buildHandoffSummary("UTI Adulto", "night → morning", [
        "José da Silva",
        "Pedro Henrique Lima",
        "Carlos Eduardo Pereira",
        "Roberto Nascimento",
        "Cláudia Ferreira",
      ]) as any,
      status: HandoffStatus.ACKNOWLEDGED,
    },
  });

  // Clínica: passagem noite → manhã (PENDING)
  const handoffClinica = await prisma.shiftHandoff.create({
    data: {
      wardId: wardClinica.id,
      fromShiftId: shifts.clinicaNightClosed.id,
      toShiftId: shifts.clinicaMorningOpen.id,
      generatedAt: hoursAgo(4),
      summaryJson: buildHandoffSummary("Clínica Médica", "night → morning", [
        "Ana Maria Souza",
        "Beatriz Andrade",
        "Mariana Costa",
      ]) as any,
      status: HandoffStatus.PENDING,
    },
  });

  // Pediatria: passagem noite → manhã (PENDING)
  const handoffPed = await prisma.shiftHandoff.create({
    data: {
      wardId: wardPed.id,
      fromShiftId: shifts.pedNightClosed.id,
      toShiftId: shifts.pedMorningOpen.id,
      generatedAt: hoursAgo(4),
      summaryJson: buildHandoffSummary("Pediatria", "night → morning", [
        "Sofia Almeida",
        "Gabriel Oliveira",
      ]) as any,
      status: HandoffStatus.PENDING,
    },
  });

  console.log("✅ 3 passagens de plantão criadas (1 ACKNOWLEDGED + 2 PENDING)");

  // ─── 13. HandoffAcks ─────────────────────────────────────────────────────
  await prisma.handoffAck.create({
    data: {
      handoffId: handoffUti.id,
      userId: maria.id,
      acknowledgedAt: hoursAgo(3.5),
    },
  });
  await prisma.handoffAck.create({
    data: {
      handoffId: handoffUti.id,
      userId: joao.id,
      acknowledgedAt: hoursAgo(3),
    },
  });
  console.log("✅ 2 acks de handoff criados");

  // ─── 14. FamilyUpdates ───────────────────────────────────────────────────
  const familyUpdatesData: Array<{ patient: string; contentLay: string; generatedAt: Date }> = [
    {
      patient: "José da Silva",
      contentLay:
        "Sr. José está estável e respondendo bem ao tratamento. A pneumonia está sob controle " +
        "com o antibiótico, e a oxigenação melhorou bastante nas últimas horas. " +
        "Iniciamos hoje fisioterapia respiratória para ajudar na recuperação.",
      generatedAt: hoursAgo(2),
    },
    {
      patient: "José da Silva",
      contentLay:
        "Boletim da manhã: Sr. José passou a noite tranquilo. Sinais vitais dentro do esperado. " +
        "Equipe médica passou cedo, ajustou medicações e está satisfeita com a evolução.",
      generatedAt: hoursAgo(8),
    },
    {
      patient: "José da Silva",
      contentLay:
        "Atualização de ontem à tarde: Sr. José teve melhora do quadro respiratório. " +
        "Saturação subiu e a febre cedeu. Mantemos os cuidados de UTI.",
      generatedAt: daysAgo(1),
    },
    {
      patient: "José da Silva",
      contentLay:
        "Hoje foi feito um raio-x de tórax que mostrou redução da pneumonia. " +
        "Continuamos otimistas com a recuperação.",
      generatedAt: daysAgo(2),
    },
    {
      patient: "Ana Maria Souza",
      contentLay:
        "Sra. Ana mantém quadro estável. A retenção de líquidos diminuiu com o ajuste " +
        "do diurético. Sem desconforto respiratório no momento.",
      generatedAt: hoursAgo(1),
    },
    {
      patient: "Ana Maria Souza",
      contentLay:
        "Boletim de ontem: Sra. Ana teve boa resposta ao tratamento. Conseguiu se alimentar " +
        "normalmente e dormiu bem. A equipe está ajustando a medicação conforme a evolução.",
      generatedAt: daysAgo(1),
    },
    {
      patient: "Pedro Henrique Lima",
      contentLay:
        "Sr. Pedro continua estável após o AVC. Iniciamos hoje a fisioterapia motora " +
        "para começar a recuperar movimentos do lado direito. Ele está consciente e responde a perguntas.",
      generatedAt: hoursAgo(6),
    },
    {
      patient: "Pedro Henrique Lima",
      contentLay:
        "Atualização: Sr. Pedro teve uma boa noite. A pressão arterial está controlada. " +
        "Amanhã faremos um exame de doppler para avaliar as artérias do pescoço.",
      generatedAt: daysAgo(1),
    },
    {
      patient: "Sofia Almeida",
      contentLay:
        "Sofia está se recuperando bem da bronquiolite. A respiração melhorou muito " +
        "com as inalações. Está brincando e se alimentando normalmente.",
      generatedAt: hoursAgo(4),
    },
    {
      patient: "Sofia Almeida",
      contentLay:
        "Boletim: Sofia teve uma noite mais tranquila, com menos tosse e melhor saturação. " +
        "Possivelmente terá alta nos próximos 1-2 dias se mantiver essa evolução.",
      generatedAt: daysAgo(1),
    },
  ];

  await Promise.all(
    familyUpdatesData.map((u) =>
      prisma.familyUpdate.create({
        data: {
          admissionId: admByPatient(u.patient).id,
          contentLay: u.contentLay,
          generatedAt: u.generatedAt,
        },
      }),
    ),
  );
  console.log(`✅ ${familyUpdatesData.length} atualizações de família criadas`);

  // ─── 15. FamilyMessages ──────────────────────────────────────────────────
  const familyMessagesData: Array<{
    patient: string;
    fromFamily: boolean;
    content: string;
    sentAt: Date;
    readAt?: Date;
  }> = [
    {
      patient: "José da Silva",
      fromFamily: true,
      content: "Boa tarde, doutor. Como meu marido passou hoje? Posso visitar amanhã?",
      sentAt: hoursAgo(5),
      readAt: hoursAgo(4),
    },
    {
      patient: "José da Silva",
      fromFamily: false,
      content:
        "Boa tarde Sra. Maria. Seu marido está estável, melhorando bem. " +
        "A visita amanhã às 16h está liberada (1 acompanhante por vez).",
      sentAt: hoursAgo(4),
      readAt: hoursAgo(3),
    },
    {
      patient: "Ana Maria Souza",
      fromFamily: true,
      content: "Bom dia, recebemos o boletim. Minha mãe pode receber visitas hoje?",
      sentAt: hoursAgo(8),
      readAt: hoursAgo(7),
    },
    {
      patient: "Ana Maria Souza",
      fromFamily: false,
      content: "Bom dia, sim! Horário de visitas: das 14h às 17h. Aguardamos a sua presença.",
      sentAt: hoursAgo(7),
    },
    {
      patient: "Sofia Almeida",
      fromFamily: true,
      content: "Oi, a Sofia está perguntando pelo irmão. Ele pode vir junto na visita?",
      sentAt: hoursAgo(2),
    },
    {
      patient: "Pedro Henrique Lima",
      fromFamily: true,
      content: "Boa noite. Meu pai conseguiu se alimentar hoje? Estamos preocupados.",
      sentAt: hoursAgo(12),
      readAt: hoursAgo(11),
    },
  ];

  await Promise.all(
    familyMessagesData.map((m) =>
      prisma.familyMessage.create({
        data: {
          admissionId: admByPatient(m.patient).id,
          fromFamily: m.fromFamily,
          content: m.content,
          sentAt: m.sentAt,
          readAt: m.readAt,
        },
      }),
    ),
  );
  console.log(`✅ ${familyMessagesData.length} mensagens família criadas`);

  // ─── 16. NearMiss ────────────────────────────────────────────────────────
  type NearMissSpec = {
    ward?: string;
    category: string;
    severity: string;
    description: string;
    reportedHoursAgo: number;
    aiClassification?: {
      category: string;
      severity: "low" | "medium" | "high" | "critical";
      rootCauseHypothesis: string;
      recommendedActions: string[];
      similarPatterns: string[];
    };
    isAnonymous?: boolean;
  };

  const nearMissSpecs: NearMissSpec[] = [
    {
      ward: wardUti.id,
      category: "medication",
      severity: "near_miss",
      description:
        "Quase administrada Penicilina em paciente alérgico. " +
        "Equipe de enfermagem identificou a alergia na pulseira a tempo. " +
        "Prescrição foi corrigida pelo plantonista.",
      reportedHoursAgo: 6,
      aiClassification: {
        category: "Erro de prescrição — alergia conhecida",
        severity: "high",
        rootCauseHypothesis:
          "Falha de comunicação entre admissão e prescrição. A alergia estava no prontuário " +
          "mas não foi verificada no momento da prescrição.",
        recommendedActions: [
          "Implementar alerta automático no sistema de prescrição quando houver alergia documentada",
          "Reforçar protocolo de double-check para antibióticos em paciente com alergia",
          "Treinar plantonistas sobre uso da pulseira de identificação como dupla checagem",
        ],
        similarPatterns: [
          "3 quase-erros similares envolvendo antibióticos beta-lactâmicos nos últimos 90 dias",
          "Padrão recorrente em pacientes admitidos via PS no plantão noturno",
        ],
      },
    },
    {
      ward: wardClinica.id,
      category: "fall",
      severity: "no_harm",
      description:
        "Paciente idoso escorregou ao tentar ir ao banheiro sozinho. " +
        "Foi amparado pela enfermagem antes da queda. Sem lesões.",
      reportedHoursAgo: 18,
      aiClassification: {
        category: "Risco de queda — paciente de alto risco",
        severity: "medium",
        rootCauseHypothesis:
          "Falta de auxílio para deambulação noturna em paciente classificado como alto risco de queda.",
        recommendedActions: [
          "Verificar escala de Morse na admissão e instalar campainha próxima ao leito",
          "Aumentar frequência de rondas no plantão noturno em pacientes >70 anos",
          "Instalar barras de apoio adicionais no banheiro do quarto",
        ],
        similarPatterns: [
          "Pico de eventos de queda no plantão noturno (00h-04h)",
          "Pacientes >75 anos representam 70% dos eventos",
        ],
      },
    },
    {
      ward: wardUti.id,
      category: "equipment",
      severity: "near_miss",
      description:
        "Bomba de infusão começou a apresentar alarme de oclusão sem motivo aparente. " +
        "Foi substituída imediatamente. Paciente recebia noradrenalina.",
      reportedHoursAgo: 30,
    },
    {
      ward: wardPed.id,
      category: "communication",
      severity: "near_miss",
      description:
        "Pediatra prescreveu dose adulta de medicação na ficha digital. " +
        "Farmacêutica clínica identificou o erro antes do preparo.",
      reportedHoursAgo: 48,
      aiClassification: {
        category: "Erro de dose — população pediátrica",
        severity: "critical",
        rootCauseHypothesis:
          "Sistema de prescrição não tem alerta diferenciado para cálculo de dose pediátrica por kg.",
        recommendedActions: [
          "Configurar calculadora de dose por peso no sistema de prescrição pediátrica",
          "Tornar obrigatório registro de peso atual antes de cada prescrição em pediatria",
          "Revisar todas as prescrições pediátricas das últimas 48h",
        ],
        similarPatterns: [
          "Erros de dose em pediatria são 4x mais frequentes que em adultos",
          "Maioria associada a plantonistas sem subespecialidade pediátrica",
        ],
      },
    },
    {
      ward: wardClinica.id,
      category: "procedure",
      severity: "harm",
      description:
        "Punção venosa difícil resultou em hematoma extenso em paciente anticoagulado. " +
        "Necessária avaliação cirúrgica. Sem repercussão hemodinâmica.",
      reportedHoursAgo: 72,
      aiClassification: {
        category: "Procedimento invasivo em paciente anticoagulado",
        severity: "medium",
        rootCauseHypothesis:
          "Punção realizada por profissional menos experiente sem revisão do status de coagulação.",
        recommendedActions: [
          "Implementar checklist pré-punção em pacientes com anticoagulação",
          "Reservar punções difíceis para profissionais mais experientes",
          "Considerar uso de ultrassom para acesso venoso difícil",
        ],
        similarPatterns: ["Eventos similares concentrados em plantões com staff reduzido"],
      },
    },
    {
      ward: wardClinica.id,
      category: "medication",
      severity: "no_harm",
      description:
        "Medicação administrada 2h após o horário prescrito por falta de checagem do prontuário.",
      reportedHoursAgo: 96,
    },
    {
      category: "communication",
      severity: "near_miss",
      description:
        "Passagem de plantão sem informação sobre alerta crítico de troponina. " +
        "Identificado pelo plantonista entrante ao revisar exames.",
      reportedHoursAgo: 5 * 24,
      isAnonymous: false,
    },
    {
      ward: wardUti.id,
      category: "equipment",
      severity: "near_miss",
      description:
        "Cilindro de O2 portátil entregue com pressão abaixo do ideal para transporte de paciente.",
      reportedHoursAgo: 6 * 24,
    },
  ];

  await Promise.all(
    nearMissSpecs.map((n) =>
      prisma.nearMiss.create({
        data: {
          hospitalId: hospital.id,
          wardId: n.ward,
          category: n.category,
          severity: n.severity,
          description: n.description,
          reportedAt: hoursAgo(n.reportedHoursAgo),
          isAnonymous: n.isAnonymous ?? true,
          aiClassificationJson: n.aiClassification as any,
        },
      }),
    ),
  );
  console.log(`✅ ${nearMissSpecs.length} near misses criados`);

  // ─── 17. Notifications (para a enfermeira maria) ────────────────────────
  // Foco em condutas overdue + alertas críticos. Mistura lidas/não lidas.
  const overdueConducts = allConducts.filter(
    (c) => c.deadlineAt && c.deadlineAt < new Date() && c.status !== ConductStatus.RESOLVED,
  );
  const criticalAlerts = allAlerts.filter((a) => a.severity === "critical");

  const notifSpecs: Array<{
    type: string;
    title: string;
    body: string;
    url?: string;
    createdAt: Date;
    read: boolean;
  }> = [];

  // Notificações de overdue (até 4)
  overdueConducts.slice(0, 4).forEach((c, i) => {
    notifSpecs.push({
      type: "overdue",
      title: "Conduta vencida",
      body: c.description.slice(0, 120),
      url: `/visits/${c.visitId}`,
      createdAt: minutesAgo(30 + i * 60),
      read: i >= 2, // 2 não lidas, 2 lidas
    });
  });

  // Notificações de alerta crítico
  criticalAlerts.slice(0, 3).forEach((a, i) => {
    notifSpecs.push({
      type: "critical_alert",
      title: "Alerta clínico crítico",
      body: a.description.slice(0, 120),
      url: `/visits/${a.visitId}`,
      createdAt: hoursAgo(2 + i),
      read: i >= 1,
    });
  });

  // Notificações de sistema (passagem de plantão pendente)
  notifSpecs.push({
    type: "handoff_pending",
    title: "Passagem de plantão aguardando ciência",
    body: "Clínica Médica — passagem da noite ainda sem ciência da equipe entrante.",
    url: `/handoffs/${handoffClinica.id}`,
    createdAt: hoursAgo(3),
    read: false,
  });
  notifSpecs.push({
    type: "handoff_pending",
    title: "Passagem de plantão aguardando ciência",
    body: "Pediatria — passagem da noite ainda sem ciência da equipe entrante.",
    url: `/handoffs/${handoffPed.id}`,
    createdAt: hoursAgo(3.5),
    read: false,
  });

  // Notif de mensagem da família
  notifSpecs.push({
    type: "family_message",
    title: "Nova mensagem da família",
    body: "Família de Sofia Almeida enviou uma mensagem.",
    url: `/admissions/${admByPatient("Sofia Almeida").id}`,
    createdAt: hoursAgo(2),
    read: false,
  });

  // Notif antiga (já lida)
  notifSpecs.push({
    type: "system",
    title: "Backup diário concluído",
    body: "O backup do sistema foi concluído com sucesso.",
    createdAt: daysAgo(1),
    read: true,
  });

  await Promise.all(
    notifSpecs.map((n) =>
      prisma.notification.create({
        data: {
          userId: maria.id,
          type: n.type,
          title: n.title,
          body: n.body,
          url: n.url,
          createdAt: n.createdAt,
          readAt: n.read ? new Date(n.createdAt.getTime() + 30 * 60 * 1000) : null,
        },
      }),
    ),
  );
  const unreadCount = notifSpecs.filter((n) => !n.read).length;
  console.log(`✅ ${notifSpecs.length} notificações para maria (${unreadCount} não lidas)`);

  // ─── LOG FINAL ───────────────────────────────────────────────────────────
  const familyUrl = process.env.FAMILY_PORTAL_URL ?? "http://localhost:3003";

  const counts = {
    hospitals: await prisma.hospital.count(),
    users: await prisma.user.count(),
    wards: await prisma.ward.count(),
    beds: await prisma.bed.count(),
    patients: await prisma.patient.count(),
    admissions: await prisma.admission.count(),
    familyContacts: await prisma.familyContact.count(),
    visits: await prisma.visit.count(),
    conducts: await prisma.conduct.count(),
    pendings: await prisma.pending.count(),
    alerts: await prisma.clinicalAlert.count(),
    prescriptions: await prisma.prescription.count(),
    shifts: await prisma.nursingShift.count(),
    executions: await prisma.nursingExecution.count(),
    handoffs: await prisma.shiftHandoff.count(),
    handoffAcks: await prisma.handoffAck.count(),
    familyUpdates: await prisma.familyUpdate.count(),
    familyMessages: await prisma.familyMessage.count(),
    nearMisses: await prisma.nearMiss.count(),
    notifications: await prisma.notification.count(),
  };

  console.log("\n🎉 Seed concluído com sucesso!\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 RESUMO");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  for (const [k, v] of Object.entries(counts)) {
    console.log(`   ${String(v).padStart(4, " ")} ${k}`);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📧 LOGINS (web em http://localhost:3002 — senha: 123456)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   admin@roundlog.dev      (ADMIN)");
  console.log("   joao@roundlog.dev       (PHYSICIAN — UTI/Clínica)");
  console.log("   ricardo@roundlog.dev    (PHYSICIAN — Pediatria)");
  console.log("   maria@roundlog.dev      (NURSE — alvo de notificações)");
  console.log("   beatriz@roundlog.dev    (NURSE)");
  console.log("   lucas@roundlog.dev      (NURSE)");
  console.log("   julia@roundlog.dev      (TECHNICIAN)");
  console.log("   carlos@roundlog.dev     (MANAGER)");

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("👨‍👩‍👦 PORTAL FAMILIAR (sem login — abra no PWA)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  for (const fc of familyContacts) {
    const adm = admissions.find((a) => a.id === fc.admissionId);
    const patient = adm ? patients.find((p) => p.id === adm.patientId) : null;
    console.log(`   ${patient?.name ?? "?"} (${fc.relationship} ${fc.name}):`);
    console.log(`   ${familyUrl}/family/patient/${fc.accessToken}\n`);
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
