# RoundLog API — Dockerfile dev/demo
#
# Estratégia: rodar em modo dev (tsx watch) mesmo no container, pra que o
# estudo seja idêntico ao local — hot reload via bind mount no compose, sem
# precisar de build de produção. O mesmo Dockerfile serve API e Worker
# (o command é sobrescrito no docker-compose).
#
# Uso (via docker-compose orquestrador):
#   build:
#     context: ../../roundlog-api/apps/api
#     dockerfile: Dockerfile
FROM node:20-alpine

# openssl é exigido pelo Prisma engine no Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Camada de deps separada — só re-instala quando lockfile muda
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Schema Prisma precisa estar presente pro `prisma generate` rodar agora
# e gerar o client em /app/node_modules/.prisma. Evita ter que rodar generate
# em runtime toda vez que o container sobe.
COPY prisma ./prisma
RUN npx prisma generate

# Resto do código entra por último — bind mount do compose sobrescreve em dev
COPY . .

EXPOSE 3001

# Default = servidor HTTP. Worker usa `command: ["npm", "run", "worker"]`
# no docker-compose.
CMD ["npm", "run", "dev"]
