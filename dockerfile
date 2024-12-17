# Imagen base
FROM node:20.15

# Directorio de trabajo
WORKDIR /app

# Copia dependencias y archivos de configuración
COPY package*.json tsconfig.json ./

# Instala dependencias
RUN npm install

# Instalamos Google Chrome y las dependencias necesarias
RUN apt-get update && apt-get install -y \
  wget \
  curl \
  gnupg \
  libxss1 \
  libappindicator3-1 \
  libasound2 \
  libnss3 \
  libx11-xcb1 \
  libgbm1 \
  libdrm2 \
  libxfixes3 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libxcomposite1 \
  libxrandr2 \
  libpango-1.0-0 \
  libgtk-3-0 \
  ca-certificates \
  --no-install-recommends

# Añadimos el repositorio de Google Chrome y la clave GPG
RUN curl -sSL https://dl.google.com/linux/linux_signing_key.pub | apt-key add - && \
  sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list'

# Actualizamos la lista de paquetes e instalamos Google Chrome
RUN apt-get update && apt-get install -y google-chrome-stable --no-install-recommends

# Limpiar la caché para reducir el tamaño de la imagen
RUN rm -rf /var/lib/apt/lists/*

# Continúa con el resto de tu Dockerfile...

# Copia el código fuente
COPY . .

# Compila el código TypeScript
RUN npm run build

# Comando para iniciar la aplicación
CMD ["npm", "run", "start"]
