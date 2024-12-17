# Imagen base
FROM node:20.15

# Directorio de trabajo
WORKDIR /app

# Copia dependencias y archivos de configuración
COPY package*.json tsconfig.json vite.config.js .env register-paths.js ./

# Instala dependencias
RUN npm install

# Copia el código fuente
COPY . .

# Compila el código TypeScript
RUN npm run build

# Limpia archivos innecesarios y mueve el contenido de dist
RUN find /app -mindepth 1 \
    ! -name 'dist' \
    ! -name 'package.json' \
    ! -name 'package-lock.json' \
    ! -name 'node_modules' \
    ! -name 'register-paths.js' \
    ! -name 'tsconfig.json' \
    ! -name 'vite.config.js' \
    ! -name '.env' \
    -exec rm -rf {} + \
    && mv dist/* . \
    && rm -rf dist

# Comando para iniciar la aplicación
CMD ["npm", "run", "start"]
