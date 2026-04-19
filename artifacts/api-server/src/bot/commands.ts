import { Message, EmbedBuilder } from "discord.js";
import { getPlayer } from "./player.js";
import { searchYouTube } from "./search.js";
import { logger } from "../lib/logger.js";

function createEmbed(color: number, description: string, title?: string) {
  const embed = new EmbedBuilder().setColor(color).setDescription(description);
  if (title) embed.setTitle(title);
  return embed;
}

const COLORS = {
  success: 0x57f287,
  error: 0xed4245,
  info: 0x5865f2,
  warning: 0xfee75c,
};

export async function handleMusic(message: Message, args: string[]) {
  if (!args.length) {
    return message.reply({
      embeds: [
        createEmbed(
          COLORS.error,
          "❌ Por favor proporciona el nombre de una canción.\n**Uso:** `!music Headhunterz - The Sacrifice`"
        ),
      ],
    });
  }

  if (!message.member?.voice.channel) {
    return message.reply({
      embeds: [
        createEmbed(
          COLORS.error,
          "❌ Debes estar en un canal de voz para usar este comando."
        ),
      ],
    });
  }

  const query = args.join(" ");
  const searching = await message.reply({
    embeds: [
      createEmbed(COLORS.info, `🔍 Buscando: **${query}**...`),
    ],
  });

  try {
    const song = await searchYouTube(query, message.author.username);

    if (!song) {
      return searching.edit({
        embeds: [
          createEmbed(
            COLORS.error,
            `❌ No se encontró ningún resultado para: **${query}**`
          ),
        ],
      });
    }

    const player = getPlayer(message.guildId!);
    const added = await player.addSong(song, message.member);

    if (!added) {
      return searching.edit({
        embeds: [
          createEmbed(
            COLORS.error,
            "❌ No pude unirme a tu canal de voz. ¿Tienes permisos?"
          ),
        ],
      });
    }

    const isNowPlaying = player.isPlaying() && player.getCurrentSong()?.url === song.url;
    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle(isNowPlaying ? "🎵 Reproduciendo ahora" : "✅ Añadido a la cola")
      .setDescription(`**[${song.title}](${song.url})**`)
      .addFields(
        { name: "⏱ Duración", value: song.duration, inline: true },
        { name: "👤 Solicitado por", value: song.requestedBy, inline: true }
      );

    if (song.thumbnail) embed.setThumbnail(song.thumbnail);

    await searching.edit({ embeds: [embed] });
  } catch (err) {
    logger.error({ err }, "Error in !music command");
    await searching.edit({
      embeds: [
        createEmbed(COLORS.error, "❌ Ocurrió un error al reproducir la canción."),
      ],
    });
  }
}

export async function handleSkip(message: Message) {
  if (!message.member?.voice.channel) {
    return message.reply({
      embeds: [createEmbed(COLORS.error, "❌ Debes estar en un canal de voz.")],
    });
  }

  const player = getPlayer(message.guildId!);
  const skipped = player.skip();

  if (!skipped) {
    return message.reply({
      embeds: [createEmbed(COLORS.warning, "⚠️ No hay ninguna canción reproduciéndose.")],
    });
  }

  return message.reply({
    embeds: [createEmbed(COLORS.success, "⏭️ Canción omitida.")],
  });
}

export async function handleStop(message: Message) {
  if (!message.member?.voice.channel) {
    return message.reply({
      embeds: [createEmbed(COLORS.error, "❌ Debes estar en un canal de voz.")],
    });
  }

  const player = getPlayer(message.guildId!);
  player.stop();

  return message.reply({
    embeds: [createEmbed(COLORS.success, "⏹️ Reproducción detenida y cola limpiada.")],
  });
}

export async function handlePause(message: Message) {
  if (!message.member?.voice.channel) {
    return message.reply({
      embeds: [createEmbed(COLORS.error, "❌ Debes estar en un canal de voz.")],
    });
  }

  const player = getPlayer(message.guildId!);
  const paused = player.pause();

  if (!paused) {
    return message.reply({
      embeds: [createEmbed(COLORS.warning, "⚠️ No hay música reproduciéndose para pausar.")],
    });
  }

  return message.reply({
    embeds: [createEmbed(COLORS.success, "⏸️ Música pausada.")],
  });
}

export async function handleResume(message: Message) {
  if (!message.member?.voice.channel) {
    return message.reply({
      embeds: [createEmbed(COLORS.error, "❌ Debes estar en un canal de voz.")],
    });
  }

  const player = getPlayer(message.guildId!);
  const resumed = player.resume();

  if (!resumed) {
    return message.reply({
      embeds: [createEmbed(COLORS.warning, "⚠️ La música no está pausada.")],
    });
  }

  return message.reply({
    embeds: [createEmbed(COLORS.success, "▶️ Música reanudada.")],
  });
}

export async function handleQueue(message: Message) {
  const player = getPlayer(message.guildId!);
  const current = player.getCurrentSong();
  const queue = player.getQueue();

  if (!current && queue.length === 0) {
    return message.reply({
      embeds: [createEmbed(COLORS.info, "📭 La cola está vacía.")],
    });
  }

  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle("🎶 Cola de reproducción");

  if (current) {
    embed.addFields({
      name: "▶️ Reproduciendo ahora",
      value: `**[${current.title}](${current.url})** \`${current.duration}\` — Solicitada por ${current.requestedBy}`,
    });
  }

  if (queue.length > 0) {
    const queueList = queue
      .slice(0, 10)
      .map(
        (song, i) =>
          `**${i + 1}.** [${song.title}](${song.url}) \`${song.duration}\` — ${song.requestedBy}`
      )
      .join("\n");

    embed.addFields({
      name: `📋 En cola (${queue.length} canción${queue.length !== 1 ? "es" : ""})`,
      value: queueList + (queue.length > 10 ? `\n*...y ${queue.length - 10} más*` : ""),
    });
  }

  return message.reply({ embeds: [embed] });
}

export async function handleNowPlaying(message: Message) {
  const player = getPlayer(message.guildId!);
  const song = player.getCurrentSong();

  if (!song) {
    return message.reply({
      embeds: [createEmbed(COLORS.info, "📭 No hay ninguna canción reproduciéndose ahora.")],
    });
  }

  const status = player.isPausedState() ? "⏸️ Pausado" : "▶️ Reproduciendo";
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(`${status}: ${song.title}`)
    .setDescription(`**[${song.title}](${song.url})**`)
    .addFields(
      { name: "⏱ Duración", value: song.duration, inline: true },
      { name: "👤 Solicitado por", value: song.requestedBy, inline: true }
    );

  if (song.thumbnail) embed.setThumbnail(song.thumbnail);

  return message.reply({ embeds: [embed] });
}

export async function handleHelp(message: Message) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle("🎵 Bot de Música — Comandos disponibles")
    .addFields(
      { name: "`!music <canción>`", value: "Busca y reproduce una canción", inline: false },
      { name: "`!nowplaying`", value: "Muestra la canción actual", inline: false },
      { name: "`!queue`", value: "Muestra la cola de reproducción", inline: false },
      { name: "`!skip`", value: "Omite la canción actual", inline: false },
      { name: "`!pause`", value: "Pausa la reproducción", inline: false },
      { name: "`!resume`", value: "Reanuda la reproducción", inline: false },
      { name: "`!stop`", value: "Detiene la música y limpia la cola", inline: false },
    )
    .setFooter({ text: "Ejemplo: !music Headhunterz - The Sacrifice" });

  return message.reply({ embeds: [embed] });
}
