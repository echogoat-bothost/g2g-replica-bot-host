FROM node:22

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10 --no-fund --no-audit

# Copy workspace manifests for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./

COPY lib/db/package.json ./lib/db/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/

# Install dependencies (--ignore-scripts skips the preinstall pnpm guard)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy full source
COPY . .

# Build libs then bundle the bot
RUN pnpm run typecheck:libs
RUN pnpm --filter @workspace/api-server run build

EXPOSE 8080

CMD ["node", "artifacts/api-server/dist/index.mjs"]
