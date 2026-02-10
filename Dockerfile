# Etapa 1: Construcción (Build)
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias (incluyendo las de desarrollo para compilar)
RUN npm install

# Copiar el resto del código y compilar
COPY . .
RUN npm run build

# Etapa 2: Producción
FROM node:20-alpine AS runner

WORKDIR /app

# Variable de entorno para producción
ENV NODE_ENV=production

# Copiar solo lo necesario desde la etapa builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Instalar solo dependencias de producción (más ligero)
RUN npm install --only=production

# Google Cloud Run usa el puerto 8080 por defecto
EXPOSE 8080

# Comando para iniciar la aplicación
CMD ["node", "dist/main"]