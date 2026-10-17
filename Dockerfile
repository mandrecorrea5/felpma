# Imagem de produção do site da FELPMA (Next.js standalone + Payload)
FROM node:22-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
# Next congela NEXT_PUBLIC_* no build. Quem define o valor é o build.args do
# docker-compose.prod.yml — sem ele o sitemap/robots saem com localhost:3000.
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL
# Ndovu (observabilidade) é frontend puro: a chave é embutida no bundle, então
# também precisa existir no build. Vazias = SDK fica no-op e o site sobe igual.
ARG NEXT_PUBLIC_NDOVU_ENDPOINT
ARG NEXT_PUBLIC_NDOVU_API_KEY
ARG NEXT_PUBLIC_NDOVU_APP
ARG NEXT_PUBLIC_APP_VERSION
ENV NEXT_PUBLIC_NDOVU_ENDPOINT=$NEXT_PUBLIC_NDOVU_ENDPOINT \
    NEXT_PUBLIC_NDOVU_API_KEY=$NEXT_PUBLIC_NDOVU_API_KEY \
    NEXT_PUBLIC_NDOVU_APP=$NEXT_PUBLIC_NDOVU_APP \
    NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# O build gera as páginas sob demanda; não precisa de banco nesta etapa
# porque as páginas que consultam o banco são renderizadas na primeira visita.
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
RUN mkdir -p media documentos && chown nextjs:nodejs media documentos
USER nextjs
EXPOSE 3000
# As migrations do banco rodam automaticamente ao iniciar (prodMigrations no payload.config.ts).
CMD ["node", "server.js"]
