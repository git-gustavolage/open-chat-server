FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install
RUN npm install -g ts-node typescript

COPY . .

EXPOSE 9001

CMD ["npm", "run", "dev"]
