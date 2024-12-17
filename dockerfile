# Imagen base
FROM node:20.15

# Directorio de trabajo
WORKDIR /app

# Copia dependencias y archivos de configuración
COPY package*.json tsconfig.json ./

# Instala dependencias
RUN npm install --omit=dev

# Copia solo el código fuente necesario
COPY ./src ./src
COPY ./vite.config.js ./vite.config.js
COPY ./register-paths.js ./register-paths.js

# Compila el código TypeScript
RUN npm run build

# Copia archivos necesarios desde el build
COPY ./dist/app.js ./app.js
COPY ./package.json ./package.json

# Comando para iniciar la aplicación
CMD ["npm", "run", "start"]

