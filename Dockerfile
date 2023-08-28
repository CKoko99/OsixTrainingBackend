FROM node:18

WORKDIR /app

#COPY package.json /app
COPY package*.json ./

RUN npm install

COPY . .


#ONLY 1 CMD PER DOCKERFILE
CMD ["node", "index.js"]