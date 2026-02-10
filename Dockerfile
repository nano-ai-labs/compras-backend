# 1. Etapa de Construcción
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate

# IMPORTANTE: Copiar TODO antes del build
COPY . .
RUN npm run build

# 2. Etapa de Producción
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copiamos las dependencias y la carpeta dist desde el builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 8080

# Usamos la ruta completa para evitar dudas
CMD ["node", "dist/main.js"]