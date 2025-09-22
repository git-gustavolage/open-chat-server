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

# cria usuário não-root
RUN useradd -m nodeapp

# dá permissão para /app
RUN chown -R nodeapp:nodeapp /app

USER nodeapp

EXPOSE 9001
CMD ["node", "dist/server.js"]
