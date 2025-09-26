FROM node:20 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

FROM node:20 AS runner
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

RUN useradd -m nodeapp

RUN chown -R nodeapp:nodeapp /app

USER nodeapp

EXPOSE 9001

CMD ["node", "dist/server.js"]
