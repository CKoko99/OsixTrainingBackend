FROM node:13

WORKDIR /app

#COPY package.json /app
COPY package*.json ./

RUN npm install

COPY . .

ENV PORT=8080

EXPOSE 8080

#ONLY 1 CMD PER DOCKERFILE
CMD ["node", "index.js"]