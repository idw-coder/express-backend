FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./

# 開発ステージ
FROM base AS dev
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]

# 本番ステージ
FROM base AS prod
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]