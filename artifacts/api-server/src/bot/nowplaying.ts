import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageActionRowComponentBuilder,
} from "discord.js";
import { Song } from "./queue.js";

export const BTN = {
  REWIND: "music_rewind",
  PAUSE: "music_pause",
  SKIP: "music_skip",
  LOOP: "music_loop",
  STOP: "music_stop",
};

export function buildNowPlayingEmbed(
  song: Song | undefined,
  isPaused: boolean,
  isLooping: boolean
): EmbedBuilder {
  if (!song) {
    return new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("📭 Sin reproducción")
      .setDescription("La cola está vacía. Usa `!music <canción>` para empezar.")
      .setFooter({ text: "Bot de Música" });
  }

  const status = isPaused ? "⏸️ Pausado" : "▶️ Reproduciendo";
  const loopBadge = isLooping ? " · 🔁 Loop activo" : "";

  return new EmbedBuilder()
    .setColor(isPaused ? 0xfee75c : 0x5865f2)
    .setAuthor({ name: `${status}${loopBadge}` })
    .setTitle(song.title)
    .setURL(song.url)
    .addFields(
      { name: "⏱ Duración", value: song.duration, inline: true },
      { name: "👤 Solicitada por", value: song.requestedBy, inline: true }
    )
    .setThumbnail(song.thumbnail ?? null)
    .setFooter({ text: "Bot de Música" });
}

export function buildControlButtons(
  isPaused: boolean,
  isLooping: boolean,
  isEmpty: boolean
): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
  const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(BTN.REWIND)
      .setEmoji("⏮️")
      .setLabel("Retroceso")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isEmpty),

    new ButtonBuilder()
      .setCustomId(BTN.PAUSE)
      .setEmoji(isPaused ? "▶️" : "⏸️")
      .setLabel(isPaused ? "Reanudar" : "Pausar")
      .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary)
      .setDisabled(isEmpty),

    new ButtonBuilder()
      .setCustomId(BTN.SKIP)
      .setEmoji("⏭️")
      .setLabel("Saltar")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isEmpty),

    new ButtonBuilder()
      .setCustomId(BTN.LOOP)
      .setEmoji("🔁")
      .setLabel(isLooping ? "Loop: ON" : "Loop: OFF")
      .setStyle(isLooping ? ButtonStyle.Success : ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(BTN.STOP)
      .setEmoji("🔴")
      .setLabel("Parar")
      .setStyle(ButtonStyle.Danger)
  );

  return [row];
}
