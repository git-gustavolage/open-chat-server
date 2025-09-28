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

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nodeapp

EXPOSE 9001

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
