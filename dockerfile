FROM node:20.15

WORKDIR /app

# Copia y configura dependencias
COPY package*.json tsconfig.json ./
RUN npm install

# Copia todo el proyecto
COPY . .

# Compila el proyecto
RUN npm run build

# Verifica el contenido de /app
RUN ls -l /app

# Exponer el puerto y comando de inicio
EXPOSE 3000
CMD ["npm", "start"]
