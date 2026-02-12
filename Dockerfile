FROM node:20-alpine
# ESTA LÍNEA ES VITAL:
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY . .

# Compilamos
RUN npm run build

ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

# Este comando busca el archivo main.js donde sea que esté dentro de dist y lo ejecuta
CMD ["sh", "-c", "node $(find dist -name main.js | head -n 1)"]