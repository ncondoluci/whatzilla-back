# Usa una imagen base ligera de Node.js
FROM node:18-alpine

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos necesarios para instalar dependencias
COPY package*.json tsconfig.json ./

# Instala dependencias de producción
RUN npm install --production

# Copia el resto del código fuente al contenedor
COPY . .

# Compila el código TypeScript a JavaScript
RUN npm run build

# Expone el puerto para la aplicación
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["npm", "start"]
