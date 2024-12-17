# Imagen base
FROM node:20.15

# Directorio de trabajo inicial
WORKDIR /app

# Copia dependencias y archivos de configuración
COPY package*.json tsconfig.json ./

# Instala dependencias
RUN npm install

# Copia el código fuente
COPY . .

# Compila el código TypeScript
RUN npm run build

# Cambia el directorio de trabajo a dist
WORKDIR /app/dist

# Comando para iniciar la aplicación (reutiliza el script start)
CMD ["npm", "run", "start", "--prefix", "/app"]
