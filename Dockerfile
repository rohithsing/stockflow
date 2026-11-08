# Single image that builds the React client and serves it from the Express API.
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci

COPY . .
RUN npm run build


FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    DATABASE_FILE=/data/stockflow.sqlite

COPY package*.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci --omit=dev --workspace server --include-workspace-root

COPY server ./server
COPY --from=build /app/client/dist ./client/dist

RUN mkdir -p /data
VOLUME ["/data"]
EXPOSE 4000

CMD ["node", "server/src/index.js"]
