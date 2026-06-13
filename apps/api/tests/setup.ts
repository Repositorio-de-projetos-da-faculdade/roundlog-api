// Ambiente neutro para testes — evita usar .env de dev por engano.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-jwt-secret";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret";
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
process.env.LOG_LEVEL = "silent";
