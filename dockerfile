# Usa una imagen base ligera de Node.js
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

# Instala las dependencias
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
