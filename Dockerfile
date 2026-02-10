FROM node:20-alpine

WORKDIR /app

# 1. Copiar archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# 2. Instalar dependencias y generar Prisma
RUN npm install
RUN npx prisma generate

# 3. Copiar TODO el código fuente
COPY . .

# 4. Compilar el proyecto
RUN npm run build

# 5. Configurar puerto y host
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

# 6. Comando de arranque (usando la ruta relativa)
CMD ["node", "dist/main.js"]