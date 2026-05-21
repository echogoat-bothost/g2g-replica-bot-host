FROM node:22-slim

WORKDIR /app

# Disable corepack integrity key verification (required in Railway CI)
ENV COREPACK_INTEGRITY_KEYS=0

RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

# Copy workspace manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./

COPY lib/db/package.json ./lib/db/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY artifacts/api-server/package.json ./artifacts/api-server/

# --ignore-scripts skips the workspace preinstall guard that blocks npm
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy full source
COPY . .

# Build libs then bundle the bot
RUN pnpm run typecheck:libs
RUN pnpm --filter @workspace/api-server run build

EXPOSE 8080

CMD ["node", "artifacts/api-server/dist/index.mjs"]
