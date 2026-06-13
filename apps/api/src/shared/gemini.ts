// src/shared/gemini.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

// Lazy client: só inicializa quando a chave existe. Em dev sem chave, as
// chamadas de Gemini caem em fallback (não quebram o servidor).
let cachedClient: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!cachedClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY ausente — defina no .env para usar IA");
    }
    cachedClient = new GoogleGenerativeAI(key);
  }
  return cachedClient;
}

export const isGeminiEnabled = (): boolean => !!process.env.GEMINI_API_KEY;

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

export interface NearMissClassification {
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  rootCauseHypothesis: string;
  recommendedActions: string[];
  similarPatterns: string[];
}

// --- Prompts ---

const VISIT_EXTRACTION_PROMPT = `
Você é um assistente clínico que estrutura informações ditadas em áudio durante uma visita médica beira-leito.

REGRAS CRÍTICAS — NUNCA QUEBRE:
1. NÃO INVENTE conteúdo clínico. Se o áudio estiver mudo, ininteligível, em silêncio, com apenas ruído, ou não for sobre uma visita médica, retorne todos os campos vazios:
   { "transcript": "", "conducts": [], "pendings": [], "alerts": [], "prescriptions": [] }
2. NÃO use exemplos genéricos ("dor no peito", "melatonina", "loratadina", "alérgico a penicilina", "raio-X de tórax") a menos que tenham sido EXPLICITAMENTE mencionados no áudio.
3. Transcreva LITERALMENTE o que ouviu, em português brasileiro. Não complete frases que o falante não terminou. Não adicione diálogo que não existe.
4. Se entendeu pouco, transcreva só o que entendeu — pode ser uma frase curta ou até uma palavra. É preferível um transcript curto e fiel a um longo e inventado.
5. Só extraia conducts/pendings/alerts/prescriptions baseado em frases REAIS do áudio. Se não há nenhuma menção a medicação, prescriptions = []. Se não há nenhuma ordem ou ação, conducts = []. E assim por diante.

Retorne SOMENTE um JSON válido (sem markdown, sem explicação) com essa estrutura:
{
  "transcript": "transcrição literal do áudio em pt-BR, ou string vazia se nada compreensível",
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

const NEAR_MISS_CLASSIFICATION_PROMPT = `
Você é um especialista em segurança do paciente e análise de eventos adversos.
Classifique o quase-erro abaixo e retorne SOMENTE um JSON válido com essa estrutura:
{
  "category": "medicação | comunicação | identificação | procedimento | equipamento | queda | outro",
  "severity": "low | medium | high | critical",
  "rootCauseHypothesis": "hipótese curta de causa raiz",
  "recommendedActions": ["ação 1", "ação 2"],
  "similarPatterns": ["padrão 1"]
}
Quase-erro: {near_miss_description}
Retorne APENAS o JSON.
`;

function parseJson<T>(text: string): T {
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned) as T;
}

// --- Cliente ---

export const gemini = {
  async processVisitAudio(audioBuffer: Buffer, mimeType = "audio/webm"): Promise<VisitStructuredData> {
    const model = getClient().getGenerativeModel({
      model: "gemini-2.5-flash",
      // temperature 0 reduz drasticamente a chance de alucinação ao transcrever.
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    });
    const audioPart = {
      inlineData: { data: audioBuffer.toString("base64"), mimeType },
    };
    const result = await model.generateContent([VISIT_EXTRACTION_PROMPT, audioPart]);
    return parseJson<VisitStructuredData>(result.response.text());
  },

  async generateFamilySummary(structuredJson: object): Promise<string> {
    const model = getClient().getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = FAMILY_SUMMARY_PROMPT.replace(
      "{structured_json}",
      JSON.stringify(structuredJson, null, 2),
    );
    const result = await model.generateContent(prompt);
    return result.response.text();
  },

  async generateHandoffSummary(wardData: WardHandoffData): Promise<string> {
    const model = getClient().getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      Gere um resumo de passagem de plantão claro e direto para a equipe de enfermagem.
      Dados do turno: ${JSON.stringify(wardData, null, 2)}
      Inclua: pacientes em atenção, condutas pendentes, alertas abertos e ocorrências relevantes.
    `;
    const result = await model.generateContent(prompt);
    return result.response.text();
  },

  async classifyNearMiss(description: string, context?: string): Promise<NearMissClassification> {
    const model = getClient().getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = NEAR_MISS_CLASSIFICATION_PROMPT.replace(
      "{near_miss_description}",
      context ? `${description}\nContexto: ${context}` : description,
    );
    const result = await model.generateContent(prompt);
    return parseJson<NearMissClassification>(result.response.text());
  },
};
