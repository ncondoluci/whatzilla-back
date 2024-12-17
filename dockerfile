# Etapa 1: Compilación
FROM node:20.15 AS builder

WORKDIR /app

# Copia archivos de configuración e instala dependencias
COPY package*.json tsconfig.json ./
RUN npm install

# Copia el código fuente y compila
COPY . .
RUN npm run build

# Etapa 2: Producción
FROM node:20.15

WORKDIR /app

# Copia archivos necesarios desde la etapa builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/register-paths.js ./register-paths.js
COPY --from=builder /app/vite.config.js ./vite.config.js

# Copia solo los archivos compilados del build
COPY --from=builder /app/dist/app.js ./app.js
COPY --from=builder /app/dist/src ./src # Si el build incluye "src"

# Configura entorno de producción
ENV NODE_ENV=production

# Comando para iniciar la aplicación
CMD ["npm", "run", "start"]
