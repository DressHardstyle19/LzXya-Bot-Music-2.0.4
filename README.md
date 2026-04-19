# 🎵 Discord Music Bot

Bot de música para Discord con soporte de voz, cola de reproducción y panel de control interactivo con botones.

## Características

- Reproduce música desde YouTube directamente en canales de voz
- Panel de control con botones interactivos (pausa, skip, retroceso, loop, parar)
- Cola de reproducción con soporte para múltiples canciones
- Modo loop para repetir la canción actual
- Embeds informativos y coloridos

## Comandos

| Comando | Alias | Descripción |
|---------|-------|-------------|
| `!music <canción>` | `!play`, `!p` | Busca y reproduce una canción |
| `!nowplaying` | `!np` | Muestra el panel de control con botones |
| `!queue` | `!q` | Muestra la cola de reproducción |
| `!skip` | `!s` | Omite la canción actual |
| `!pause` | — | Pausa la reproducción |
| `!resume` | `!r` | Reanuda la reproducción |
| `!stop` | — | Detiene la música y desconecta el bot |
| `!help` | — | Muestra todos los comandos |

## Botones del panel de control

Cuando se reproduce una canción, aparece un panel con 5 botones:

| Botón | Función |
|-------|---------|
| ⏮️ Retroceso | Reinicia la canción desde el inicio |
| ⏸️ Pausar / ▶️ Reanudar | Pausa o reanuda la reproducción |
| ⏭️ Saltar | Omite la canción actual |
| 🔁 Loop ON/OFF | Activa o desactiva el loop de la canción actual |
| 🔴 Parar | Detiene la música y desconecta el bot |

## Configuración

### 1. Crear el bot en Discord

1. Ve a [Discord Developer Portal](https://discord.com/developers/applications)
2. Crea una nueva aplicación
3. Ve a **Bot** → **Reset Token** y copia el token
4. Activa los **Privileged Gateway Intents**:
   - Server Members Intent
   - Message Content Intent

### 2. Variables de entorno

Copia `.env.example` a `.env` y rellena los valores:

```bash
cp .env.example .env
```

```env
DISCORD_TOKEN=tu_token_aqui
```

### 3. Instalar dependencias

```bash
pnpm install
```

### 4. Ejecutar el bot

```bash
pnpm --filter @workspace/api-server run dev
```

### 5. Invitar el bot a tu servidor

En el [Discord Developer Portal](https://discord.com/developers/applications), ve a **OAuth2 → URL Generator**:
- Scopes: `bot`
- Bot Permissions: `Connect`, `Speak`, `Send Messages`, `Read Messages/View Channels`, `Use Voice Activity`

## Stack técnico

- **Runtime**: Node.js 24
- **Framework**: Express 5 + TypeScript
- **Discord**: discord.js v14
- **Voz**: @discordjs/voice
- **Música**: play-dl (YouTube)
- **Monorepo**: pnpm workspaces
