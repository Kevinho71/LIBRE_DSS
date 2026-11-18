# LIBREDSS: un solo servicio (API + PWA) para Railway u otro host de contenedores.
# Etapa 1: compila shared -> frontend (vite) -> backend (tsc).
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci

COPY shared shared
COPY backend backend
COPY frontend frontend

# La API vive en el mismo origen, bajo /api/v1 (sin CORS).
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build --workspace=@libredss/shared \
 && npm run build --workspace=@libredss/frontend \
 && npm run build --workspace=@libredss/backend

# Etapa 2: runtime con solo dependencias de producción.
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --omit=dev --workspace=@libredss/shared --workspace=@libredss/backend --include-workspace-root \
 && npm cache clean --force

COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/backend/dist backend/dist
COPY --from=build /app/frontend/dist frontend/dist
# tsc no copia los .sql: las migraciones se leen junto a db/migrate.js.
COPY backend/src/db/migrations backend/dist/src/db/migrations

USER node
EXPOSE 3001

# Migraciones idempotentes y luego el servidor. Railway inyecta PORT.
CMD ["sh", "-c", "node backend/dist/src/db/migrate.js && node backend/dist/src/server.js"]
