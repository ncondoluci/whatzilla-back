# Etapa 1: Compilación
FROM node:20.15 AS builder

# Directorio de trabajo
WORKDIR /app

# Copia los archivos necesarios para instalar dependencias y compilar
COPY package*.json tsconfig.json ./

# Instala dependencias necesarias para la compilación
RUN npm install

# Copia el código fuente
COPY . .

# Compila el código TypeScript
RUN npm run build

# Etapa 2: Entorno de Producción
FROM node:20.15

# Directorio de trabajo limpio
WORKDIR /app

# Copia únicamente las dependencias necesarias y el código compilado
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./ # Solo el código compilado en el root

# Configura el entorno como producción
ENV NODE_ENV=production

# Comando para iniciar la aplicación
CMD ["npm", "run", "start"]
