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
import { VoiceChannel, GuildMember } from "discord.js";
import { MusicQueue, Song } from "./queue.js";
import playdl from "play-dl";
import { logger } from "../lib/logger.js";

export class GuildPlayer {
  private player: AudioPlayer;
  private queue: MusicQueue;
  private guildId: string;
  private currentSong: Song | undefined;
  private isPaused: boolean = false;

  constructor(guildId: string) {
    this.guildId = guildId;
    this.player = createAudioPlayer();
    this.queue = new MusicQueue();
    this._setupPlayerEvents();
  }

  private _setupPlayerEvents() {
    this.player.on(AudioPlayerStatus.Idle, () => {
      this.currentSong = undefined;
      this._playNext();
    });

    this.player.on("error", (err) => {
      logger.error({ err }, "Audio player error");
      this.currentSong = undefined;
      this._playNext();
    });
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

    if (this.player.state.status === AudioPlayerStatus.Idle && !this.isPaused) {
      this._playNext();
    }

    return true;
  }

  private async _playNext() {
    const song = this.queue.shift();
    if (!song) {
      this.currentSong = undefined;
      return;
    }

    this.currentSong = song;

    try {
      const stream = await playdl.stream(song.url, { quality: 2 });
      const resource = createAudioResource(stream.stream, {
        inputType: stream.type as StreamType,
      });
      this.player.play(resource);
      this.isPaused = false;
    } catch (err) {
      logger.error({ err, song }, "Failed to create audio resource");
      this.currentSong = undefined;
      this._playNext();
    }
  }

  skip(): boolean {
    if (
      this.player.state.status === AudioPlayerStatus.Idle &&
      !this.currentSong
    ) {
      return false;
    }
    this.player.stop(true);
    return true;
  }

  pause(): boolean {
    if (this.player.state.status === AudioPlayerStatus.Playing) {
      this.player.pause();
      this.isPaused = true;
      return true;
    }
    return false;
  }

  resume(): boolean {
    if (this.player.state.status === AudioPlayerStatus.Paused) {
      this.player.unpause();
      this.isPaused = false;
      return true;
    }
    return false;
  }

  stop() {
    this.queue.clear();
    this.currentSong = undefined;
    this.isPaused = false;
    this.player.stop(true);
    const connection = this.getConnection();
    if (connection) {
      connection.destroy();
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
    return this.isPaused;
  }
}

const players = new Map<string, GuildPlayer>();

export function getPlayer(guildId: string): GuildPlayer {
  if (!players.has(guildId)) {
    players.set(guildId, new GuildPlayer(guildId));
  }
  return players.get(guildId)!;
}
