# Imagen base
FROM node:20.15

# Directorio de trabajo
WORKDIR /app

# Copia archivos necesarios para instalar dependencias
COPY package*.json tsconfig.json ./

# Instala las dependencias
RUN npm install

# Copia todo el código fuente ANTES de compilar
COPY . .

# Compila el código TypeScript
RUN npm run build

# Expone el puerto de la aplicación
EXPOSE 3000

# Comando de inicio
CMD ["node", "-r", "tsconfig-paths/register", "dist/app.js"]

