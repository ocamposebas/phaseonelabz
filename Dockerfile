FROM node:22-alpine AS runtime

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG PUBLIC_PRESENCE_WS_URL
ENV PUBLIC_PRESENCE_WS_URL=$PUBLIC_PRESENCE_WS_URL

RUN npm run build

ENV HOST=0.0.0.0
ENV PORT=4321
ENV NODE_USE_SYSTEM_CA=1

EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]
