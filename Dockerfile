FROM node:20-slim

RUN apt-get update && \
    apt-get install -y ffmpeg curl ca-certificates python3 python3-pip --no-install-recommends && \
    pip3 install --break-system-packages yt-dlp && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@10

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/api-server/package.json ./artifacts/api-server/

RUN pnpm install --no-frozen-lockfile --config.minimumReleaseAge=0

COPY . .

RUN pnpm --filter @workspace/api-server run build

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
