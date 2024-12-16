FROM node:20.15

WORKDIR /app

# Copiar archivos clave
COPY package*.json tsconfig.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Compilar TypeScript
RUN npx tsc

EXPOSE 3000

CMD ["npm", "start"]
