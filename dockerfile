# Imagen base
FROM node:20.15

# Directorio de trabajo
WORKDIR /app

# Copia archivos de configuración
COPY package*.json tsconfig.json ./

# Instala solo dependencias necesarias en producción
RUN npm install --production

# Copia todo el código fuente
COPY . .
