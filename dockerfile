# Etapa 1: Compilación
FROM node:20.15 AS builder

WORKDIR /app

# Instalar dependencias y compilar
COPY package*.json tsconfig.json ./
RUN npm install

COPY . .
RUN npm run build

# Etapa 2: Producción
FROM node:20.15

WORKDIR /app

# Copiar solo lo necesario
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist/. ./ # Copia todo el contenido de dist al root

# Configurar entorno
ENV NODE_ENV=production

CMD ["npm", "run", "start"]
