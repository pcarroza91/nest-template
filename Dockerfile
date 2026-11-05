# ------------------------------------------------------------------ base pnpm
# corepack instala la versión de pnpm fijada en package.json > packageManager.
FROM node:22-alpine AS pnpm-base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

# ------------------------------------------------------------------ builder
FROM pnpm-base AS builder

RUN pnpm install --frozen-lockfile

COPY tsconfig*.json nest-cli.json ./
COPY src ./src

RUN pnpm run build

# ------------------------------------------------------- dependencias de prod
# Install aparte en vez de `prune`: deja un node_modules limpio y cacheable,
# sin devDependencies ni binarios nativos que solo usan los tests.
FROM pnpm-base AS prod-deps

RUN pnpm install --frozen-lockfile --prod

# ------------------------------------------------------------------ runtime
FROM node:22-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app

RUN apk add --no-cache tini && addgroup -S app && adduser -S app -G app

COPY --from=prod-deps --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --chown=app:app package.json ./package.json

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health/liveness').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main"]
