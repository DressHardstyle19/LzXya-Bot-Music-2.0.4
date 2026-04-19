import { Message, EmbedBuilder, TextChannel } from "discord.js";
import { getPlayer } from "./player.js";
import { searchYouTube } from "./search.js";
import { buildNowPlayingEmbed, buildControlButtons } from "./nowplaying.js";
import { logger } from "../lib/logger.js";

function errEmbed(description: string) {
  return new EmbedBuilder().setColor(0xed4245).setDescription(description);
}
function infoEmbed(description: string) {
  return new EmbedBuilder().setColor(0x5865f2).setDescription(description);
}
function okEmbed(description: string) {
  return new EmbedBuilder().setColor(0x57f287).setDescription(description);
}
function warnEmbed(description: string) {
  return new EmbedBuilder().setColor(0xfee75c).setDescription(description);
}

export async function handleMusic(message: Message, args: string[]) {
  if (!args.length) {
    return message.reply({
      embeds: [errEmbed("❌ Proporciona el nombre de una canción.\n**Uso:** `!music Headhunterz - The Sacrifice`")],
    });
  }

  if (!message.member?.voice.channel) {
    return message.reply({
      embeds: [errEmbed("❌ Debes estar en un canal de voz.")],
    });
  }

  const query = args.join(" ");
  const searching = await message.reply({
    embeds: [infoEmbed(`🔍 Buscando: **${query}**...`)],
  });

  try {
    const song = await searchYouTube(query, message.author.username);

    if (!song) {
      return searching.edit({
        embeds: [errEmbed(`❌ No se encontró: **${query}**`)],
      });
    }

    const player = getPlayer(message.guildId!);

    if (message.channel instanceof TextChannel) {
      player.setTextChannel(message.channel);
    }

    const added = await player.addSong(song, message.member);

    if (!added) {
      return searching.edit({
        embeds: [errEmbed("❌ No pude unirme a tu canal de voz.")],
      });
    }

    const queuePos = player.getQueue().length;

    if (queuePos > 0) {
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("✅ Añadido a la cola")
        .setDescription(`**[${song.title}](${song.url})**`)
        .addFields(
          { name: "⏱ Duración", value: song.duration || "Desconocida", inline: true },
          { name: "📋 Posición", value: `#${queuePos}`, inline: true },
          { name: "👤 Solicitada por", value: song.requestedBy, inline: true }
        );
      if (song.thumbnail) embed.setThumbnail(song.thumbnail);
      await searching.edit({ embeds: [embed] });
    } else {
      await searching.delete().catch(() => {});
    }
  } catch (err) {
    logger.error({ err }, "Error in !music command");
    await searching.edit({
      embeds: [errEmbed("❌ Ocurrió un error al reproducir la canción.")],
    });
  }
}

export async function handleSkip(message: Message) {
  if (!message.member?.voice.channel) {
    return message.reply({ embeds: [errEmbed("❌ Debes estar en un canal de voz.")] });
  }
  const player = getPlayer(message.guildId!);
  const skipped = player.skip();
  if (!skipped) {
    return message.reply({ embeds: [warnEmbed("⚠️ No hay ninguna canción reproduciéndose.")] });
  }
  return message.reply({ embeds: [okEmbed("⏭️ Canción omitida.")] });
}

export async function handleStop(message: Message) {
  if (!message.member?.voice.channel) {
    return message.reply({ embeds: [errEmbed("❌ Debes estar en un canal de voz.")] });
  }
  const player = getPlayer(message.guildId!);
  player.stop();
  return message.reply({ embeds: [okEmbed("⏹️ Reproducción detenida y desconectado.")] });
}

export async function handlePause(message: Message) {
  if (!message.member?.voice.channel) {
    return message.reply({ embeds: [errEmbed("❌ Debes estar en un canal de voz.")] });
  }
  const player = getPlayer(message.guildId!);
  const paused = player.pause();
  if (!paused) {
    return message.reply({ embeds: [warnEmbed("⚠️ No hay música reproduciéndose para pausar.")] });
  }
  return message.reply({ embeds: [okEmbed("⏸️ Música pausada.")] });
}

export async function handleResume(message: Message) {
  if (!message.member?.voice.channel) {
    return message.reply({ embeds: [errEmbed("❌ Debes estar en un canal de voz.")] });
  }
  const player = getPlayer(message.guildId!);
  const resumed = player.resume();
  if (!resumed) {
    return message.reply({ embeds: [warnEmbed("⚠️ La música no está pausada.")] });
  }
  return message.reply({ embeds: [okEmbed("▶️ Música reanudada.")] });
}

export async function handleQueue(message: Message) {
  const player = getPlayer(message.guildId!);
  const current = player.getCurrentSong();
  const queue = player.getQueue();

  if (!current && queue.length === 0) {
    return message.reply({ embeds: [infoEmbed("📭 La cola está vacía.")] });
  }

  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("🎶 Cola de reproducción");

  if (current) {
    const loopBadge = player.isLooping() ? " 🔁" : "";
    embed.addFields({
      name: "▶️ Reproduciendo ahora" + loopBadge,
      value: `**[${current.title}](${current.url})** \`${current.duration}\` — ${current.requestedBy}`,
    });
  }

  if (queue.length > 0) {
    const list = queue
      .slice(0, 10)
      .map((s, i) => `**${i + 1}.** [${s.title}](${s.url}) \`${s.duration}\` — ${s.requestedBy}`)
      .join("\n");
    embed.addFields({
      name: `📋 En cola (${queue.length})`,
      value: list + (queue.length > 10 ? `\n*...y ${queue.length - 10} más*` : ""),
    });
  }

  return message.reply({ embeds: [embed] });
}

export async function handleNowPlaying(message: Message) {
  const player = getPlayer(message.guildId!);
  const song = player.getCurrentSong();

  if (!song) {
    return message.reply({ embeds: [infoEmbed("📭 No hay ninguna canción reproduciéndose.")] });
  }

  if (message.channel instanceof TextChannel) {
    player.setTextChannel(message.channel);
  }

  if (player.nowPlayingMessage) {
    try { await player.nowPlayingMessage.delete(); } catch { /* ignore */ }
  }

  player.nowPlayingMessage = await message.reply({
    embeds: [buildNowPlayingEmbed(song, player.isPausedState(), player.isLooping())],
    components: buildControlButtons(player.isPausedState(), player.isLooping(), false),
  });

  return player.nowPlayingMessage;
}

export async function handleHelp(message: Message) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🎵 Bot de Música — Comandos")
    .addFields(
      { name: "`!music <canción>`", value: "Busca y reproduce una canción", inline: false },
      { name: "`!nowplaying` / `!np`", value: "Muestra el panel de control con botones", inline: false },
      { name: "`!queue` / `!q`", value: "Muestra la cola de reproducción", inline: false },
      { name: "`!skip` / `!s`", value: "Omite la canción actual", inline: false },
      { name: "`!pause`", value: "Pausa la reproducción", inline: false },
      { name: "`!resume` / `!r`", value: "Reanuda la reproducción", inline: false },
      { name: "`!stop`", value: "Detiene la música y desconecta el bot", inline: false },
    )
    .setFooter({ text: "También puedes usar los botones del panel de control" });

  return message.reply({ embeds: [embed] });
}
