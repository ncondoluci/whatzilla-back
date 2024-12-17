# Imagen base
FROM node:20.15

# Directorio de trabajo
WORKDIR /app

# Copia dependencias y archivos de configuración
COPY package*.json tsconfig.json ./

# Instala dependencias
RUN npm install

# Copia el código fuente
COPY . .

# Compila el código TypeScript
RUN npm run build

# Comando para iniciar la aplicación
CMD ["npm", "run", "start"]
