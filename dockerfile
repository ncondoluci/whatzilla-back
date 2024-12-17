# Imagen base
FROM node:20.15

# Instalar las dependencias necesarias para Puppeteer
RUN apt-get update && apt-get install -y \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libasound2 \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

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
