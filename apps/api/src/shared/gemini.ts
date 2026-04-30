// src/shared/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// --- Tipos ---

export interface VisitStructuredData {
  transcript: string;
  conducts: Array<{
    description: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    deadline_hours: number | null;
  }>;
  pendings: Array<{
    description: string;
    assigned_to: string;
  }>;
  alerts: Array<{
    type: string;
    severity: string;
    description: string;
  }>;
  prescriptions: Array<{
    medication: string;
    dose: string;
    route: string;
    frequency: string;
    duration: string;
  }>;
}

export interface WardHandoffData {
  wardName: string;
  shiftType: string;
  patients: Array<{
    name: string;
    bed: string;
    diagnosis: string;
    openConducts: string[];
    alerts: string[];
  }>;
}

// --- Prompts ---

const VISIT_EXTRACTION_PROMPT = `
Você é um assistente clínico especializado em estruturar informações médicas.
Analise o áudio da visita médica e retorne SOMENTE um JSON válido com essa estrutura:
{
  "transcript": "transcrição completa do áudio",
  "conducts": [
    { "description": "...", "priority": "LOW|MEDIUM|HIGH|CRITICAL", "deadline_hours": null }
  ],
  "pendings": [
    { "description": "...", "assigned_to": "nursing|lab|pharmacy|radiology" }
  ],
  "alerts": [
    { "type": "drug_interaction|allergy|critical_value|fall_risk|isolation", "severity": "critical|warning|info", "description": "..." }
  ],
  "prescriptions": [
    { "medication": "...", "dose": "...", "route": "oral|iv|im|sc|topic", "frequency": "...", "duration": "..." }
  ]
}
Retorne APENAS o JSON. Sem explicações.
`;

const FAMILY_SUMMARY_PROMPT = `
Você escreve resumos de saúde para familiares de pacientes internados.
Baseado no relatório clínico abaixo, escreva um texto em linguagem simples e empática:
- Máximo 3 parágrafos
- Sem jargão médico
- Tom tranquilizador mas honesto
- Não mencione valores de exame específicos sem contexto
Relatório: {structured_json}
`;

// --- Cliente ---

export const gemini = {
  async processVisitAudio(audioBuffer: Buffer): Promise<VisitStructuredData> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const audioPart = {
      inlineData: { data: audioBuffer.toString("base64"), mimeType: "audio/webm" },
    };
    const result = await model.generateContent([VISIT_EXTRACTION_PROMPT, audioPart]);
    const text = result.response.text();
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  },

  async generateFamilySummary(structuredJson: object): Promise<string> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = FAMILY_SUMMARY_PROMPT.replace(
      "{structured_json}",
      JSON.stringify(structuredJson, null, 2)
    );
    const result = await model.generateContent(prompt);
    return result.response.text();
  },

  async generateHandoffSummary(wardData: WardHandoffData): Promise<string> {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      Gere um resumo de passagem de plantão claro e direto para a equipe de enfermagem.
      Dados do turno: ${JSON.stringify(wardData, null, 2)}
      Inclua: pacientes em atenção, condutas pendentes, alertas abertos e ocorrências relevantes.
    `;
    const result = await model.generateContent(prompt);
    return result.response.text();
  },
};
