# Imagen base
FROM node:20.15

# Directorio de trabajo
WORKDIR /app

# Copia dependencias
COPY package*.json tsconfig.json ./
RUN npm install

# Copia el código fuente
COPY . .

# Compila TypeScript
RUN npx tsc --project tsconfig.json

# Comando para iniciar la aplicación
CMD ["node", "-r", "tsconfig-paths/register", "dist/app.js"]
