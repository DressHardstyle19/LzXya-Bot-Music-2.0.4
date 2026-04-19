# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Discord Music Bot

The API server also runs a Discord music bot (`artifacts/api-server/src/bot/`).

### Commands
- `!music <song name>` (aliases: `!play`, `!p`) — Search and play a song from YouTube
- `!nowplaying` (alias: `!np`) — Show currently playing song
- `!queue` (alias: `!q`) — Show the song queue
- `!skip` (alias: `!s`) — Skip the current song
- `!pause` — Pause playback
- `!resume` (alias: `!r`) — Resume playback
- `!stop` — Stop music and clear the queue
- `!help` — Show all commands

### Architecture
- `bot/index.ts` — Discord client setup and message routing
- `bot/commands.ts` — Command handlers with Discord embeds
- `bot/player.ts` — Per-guild audio player using `@discordjs/voice`
- `bot/queue.ts` — Song queue data structure
- `bot/search.ts` — YouTube search using `ytdl-core`

### Required Secrets
- `DISCORD_TOKEN` — Bot token from Discord Developer Portal

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
