FROM node:24.18.1-alpine
WORKDIR /app
COPY package.json dev-server.mjs index.html ./
COPY src ./src
COPY public ./public
ENV HOST=0.0.0.0 PORT=4173
USER node
EXPOSE 4173
CMD ["node", "dev-server.mjs"]
