FROM node:20-bookworm

RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-pip --no-install-recommends && \
    pip3 install --break-system-packages yt-dlp && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm@10

WORKDIR /app

COPY . .

RUN pnpm install --no-frozen-lockfile --config.minimumReleaseAge=0

RUN pnpm --filter @workspace/api-server run build

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "--enable-source-maps", "./artifacts/api-server/dist/index.mjs"]
