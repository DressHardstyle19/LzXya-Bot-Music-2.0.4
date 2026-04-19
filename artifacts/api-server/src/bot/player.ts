import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  entersState,
  VoiceConnection,
  VoiceConnectionStatus,
  joinVoiceChannel,
  getVoiceConnection,
  StreamType,
} from "@discordjs/voice";
import { VoiceChannel, GuildMember, Message, TextChannel } from "discord.js";
import { MusicQueue, Song } from "./queue.js";
import { ytdlpStream } from "./ytdlp.js";
import { logger } from "../lib/logger.js";
import { buildNowPlayingEmbed, buildControlButtons } from "./nowplaying.js";

export class GuildPlayer {
  private player: AudioPlayer;
  private queue: MusicQueue;
  private guildId: string;
  private currentSong: Song | undefined;
  private _isPaused: boolean = false;
  private _loopSong: boolean = false;
  private textChannel: TextChannel | null = null;
  public nowPlayingMessage: Message | null = null;

  constructor(guildId: string) {
    this.guildId = guildId;
    this.player = createAudioPlayer();
    this.queue = new MusicQueue();
    this._setupPlayerEvents();
  }

  private _setupPlayerEvents() {
    this.player.on(AudioPlayerStatus.Idle, () => {
      if (this._loopSong && this.currentSong) {
        this.queue.prepend(this.currentSong);
      }
      this.currentSong = undefined;
      this._playNext();
    });

    this.player.on("error", (err) => {
      logger.error({ err }, "Audio player error");
      this.currentSong = undefined;
      this._playNext();
    });
  }

  setTextChannel(channel: TextChannel) {
    this.textChannel = channel;
  }

  async join(member: GuildMember): Promise<VoiceConnection | null> {
    const voiceChannel = member.voice.channel as VoiceChannel | null;
    if (!voiceChannel) return null;

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: this.guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
      connection.subscribe(this.player);
      return connection;
    } catch {
      connection.destroy();
      return null;
    }
  }

  getConnection(): VoiceConnection | undefined {
    return getVoiceConnection(this.guildId);
  }

  async addSong(song: Song, member: GuildMember): Promise<boolean> {
    const connection = this.getConnection();
    if (!connection) {
      const joined = await this.join(member);
      if (!joined) return false;
    }

    this.queue.add(song);

    if (this.player.state.status === AudioPlayerStatus.Idle && !this._isPaused) {
      await this._playNext();
    }

    return true;
  }

  async _playNext() {
    const song = this.queue.shift();
    if (!song) {
      this.currentSong = undefined;
      if (this.nowPlayingMessage) {
        const embed = buildNowPlayingEmbed(undefined, false, false);
        try { await this.nowPlayingMessage.edit({ embeds: [embed], components: [] }); } catch { /* ignore */ }
        this.nowPlayingMessage = null;
      }
      return;
    }

    this.currentSong = song;

    try {
      const proc = ytdlpStream(song.url);

      proc.stderr?.on("data", (d: Buffer) => {
        const msg = d.toString().trim();
        if (msg) logger.warn({ msg }, "yt-dlp stderr");
      });

      const resource = createAudioResource(proc.stdout, {
        inputType: StreamType.Arbitrary,
      });

      this.player.play(resource);
      this._isPaused = false;
      await this._sendNowPlayingToChannel();
    } catch (err) {
      logger.error({ err, song }, "Failed to create audio resource");
      this.currentSong = undefined;
      await this._playNext();
    }
  }

  private async _updateNowPlaying() {
    if (!this.nowPlayingMessage) return;

    const embed = buildNowPlayingEmbed(this.currentSong, this._isPaused, this._loopSong);
    const components = buildControlButtons(this._isPaused, this._loopSong, !this.currentSong);

    try {
      await this.nowPlayingMessage.edit({ embeds: [embed], components });
    } catch {
      this.nowPlayingMessage = null;
    }
  }

  private async _sendNowPlayingToChannel() {
    if (!this.textChannel) return;

    const embed = buildNowPlayingEmbed(this.currentSong, this._isPaused, this._loopSong);
    const components = buildControlButtons(this._isPaused, this._loopSong, !this.currentSong);

    if (this.nowPlayingMessage) {
      try {
        await this.nowPlayingMessage.edit({ embeds: [embed], components });
        return;
      } catch {
        this.nowPlayingMessage = null;
      }
    }

    try {
      this.nowPlayingMessage = await this.textChannel.send({ embeds: [embed], components });
    } catch (err) {
      logger.error({ err }, "Failed to send now-playing message");
    }
  }

  async sendNowPlaying(replyTarget: Message): Promise<Message> {
    const embed = buildNowPlayingEmbed(this.currentSong, this._isPaused, this._loopSong);
    const components = buildControlButtons(this._isPaused, this._loopSong, !this.currentSong);

    if (this.nowPlayingMessage) {
      try {
        await this.nowPlayingMessage.edit({ embeds: [embed], components });
        return this.nowPlayingMessage;
      } catch {
        this.nowPlayingMessage = null;
      }
    }

    this.nowPlayingMessage = await replyTarget.reply({ embeds: [embed], components });
    return this.nowPlayingMessage;
  }

  skip(): boolean {
    if (this.player.state.status === AudioPlayerStatus.Idle && !this.currentSong) {
      return false;
    }
    const wasLooping = this._loopSong;
    this._loopSong = false;
    this.player.stop(true);
    this._loopSong = wasLooping;
    return true;
  }

  async rewind(): Promise<boolean> {
    const song = this.currentSong;
    if (!song) return false;
    this.queue.prepend(song);
    this.currentSong = undefined;
    this.player.stop(true);
    return true;
  }

  pause(): boolean {
    if (this.player.state.status === AudioPlayerStatus.Playing) {
      this.player.pause();
      this._isPaused = true;
      this._updateNowPlaying();
      return true;
    }
    return false;
  }

  resume(): boolean {
    if (this.player.state.status === AudioPlayerStatus.Paused) {
      this.player.unpause();
      this._isPaused = false;
      this._updateNowPlaying();
      return true;
    }
    return false;
  }

  toggleLoop(): boolean {
    this._loopSong = !this._loopSong;
    this._updateNowPlaying();
    return this._loopSong;
  }

  stop() {
    this.queue.clear();
    this.currentSong = undefined;
    this._isPaused = false;
    this._loopSong = false;
    this.player.stop(true);
    const connection = this.getConnection();
    if (connection) connection.destroy();
    if (this.nowPlayingMessage) {
      const embed = buildNowPlayingEmbed(undefined, false, false);
      this.nowPlayingMessage.edit({ embeds: [embed], components: [] }).catch(() => {});
      this.nowPlayingMessage = null;
    }
  }

  getQueue(): Song[] {
    return this.queue.getAll();
  }

  getCurrentSong(): Song | undefined {
    return this.currentSong;
  }

  isPlaying(): boolean {
    return this.player.state.status === AudioPlayerStatus.Playing;
  }

  isPausedState(): boolean {
    return this._isPaused;
  }

  isLooping(): boolean {
    return this._loopSong;
  }
}

const players = new Map<string, GuildPlayer>();

export function getPlayer(guildId: string): GuildPlayer {
  if (!players.has(guildId)) {
    players.set(guildId, new GuildPlayer(guildId));
  }
  return players.get(guildId)!;
}
