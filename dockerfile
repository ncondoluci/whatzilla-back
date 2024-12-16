FROM node:20.15

# Establece el directorio de trabajo
WORKDIR /app

# Copia archivos clave para instalar dependencias
COPY package*.json tsconfig.json ./

# Instala dependencias
RUN npm install

# Copia todo el código fuente al contenedor
COPY . .

# Compila TypeScript usando tsconfig-paths para resolver alias
RUN npx tsc -p tsconfig.json

# Expone el puerto de la aplicación
EXPOSE 3000

# Comando para iniciar la aplicación compilada
CMD ["npm", "start"]
