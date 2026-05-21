FROM node:22-slim

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm@10.26.1

# Copy workspace manifests first for dependency caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./

COPY lib/db/package.json ./lib/db/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/

# Install all dependencies (ignore preinstall guard)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy full source
COPY . .

# Build: compile libs then bundle api-server
RUN pnpm run typecheck:libs
RUN pnpm --filter @workspace/api-server run build

EXPOSE 8080

CMD ["node", "artifacts/api-server/dist/index.mjs"]
