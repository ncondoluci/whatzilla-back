FROM node:18-alpine

WORKDIR /app

COPY package*.json tsconfig.json ./

RUN npm install

COPY . .

RUN npm run build

RUN npm prune --production

EXPOSE 3000

CMD ["npm", "start"]
