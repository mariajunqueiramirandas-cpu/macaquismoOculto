FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=secret,id=npm_ca \
    if [ -r /run/secrets/npm_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/npm_ca; fi; \
    npm ci --no-audit --no-fund

FROM dependencies AS build
COPY . .
RUN npm run build \
    && npm prune --omit=dev --no-audit --no-fund \
    && mkdir -p /release/scripts \
    && mv build node_modules package.json migrations /release/ \
    && mv scripts/migrate.mjs /release/scripts/

FROM node:24-alpine AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /release/ ./
USER node
EXPOSE 3000
CMD ["sh", "-c", "node scripts/migrate.mjs && exec node build"]
