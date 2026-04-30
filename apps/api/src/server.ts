// src/server.ts
import { app } from "./app.js";

const PORT = Number(process.env.PORT) || 3001;

async function bootstrap() {
  try {
    await app.listen({ port: PORT, host: "0.0.0.0" });
    console.log(`🚀 RoundLog API running on http://localhost:${PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

bootstrap();
