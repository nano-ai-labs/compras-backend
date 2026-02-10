# Etapa 1: Construcción (Build)
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de configuración de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar todas las dependencias
RUN npm install

# GENERAR EL CLIENTE DE PRISMA (Esto soluciona los 47 errores)
RUN npx prisma generate

# Copiar el resto del código fuente
COPY . .

# Compilar el proyecto NestJS
RUN npm run build

# Etapa 2: Producción (Imagen final ligera)
FROM node:20-alpine AS runner

WORKDIR /app

# Definir variables de entorno
ENV NODE_ENV=production

# Copiar solo lo necesario para ejecutar la app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Exponer el puerto que usa Cloud Run (8080)
EXPOSE 8080

# Comando para iniciar la aplicación
CMD ["node", "dist/main"]