FROM node:20-slim

RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux -o /usr/local/bin/yt-dlp && \
    chmod +x /usr/local/bin/yt-dlp

RUN npm install -g pnpm@10

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/ 2>/dev/null || true

RUN pnpm install --no-frozen-lockfile --config.minimumReleaseAge=0

COPY . .

RUN pnpm --filter @workspace/api-server run build

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
