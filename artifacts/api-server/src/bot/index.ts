import { Client, GatewayIntentBits, Partials } from "discord.js";
import { logger } from "../lib/logger.js";
import {
  handleMusic,
  handleSkip,
  handleStop,
  handlePause,
  handleResume,
  handleQueue,
  handleNowPlaying,
  handleHelp,
} from "./commands.js";

const PREFIX = "!";

export function startBot() {
  const token = process.env["DISCORD_TOKEN"];
  if (!token) {
    logger.warn("DISCORD_TOKEN not set, skipping bot startup");
    return;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel],
  });

  client.once("ready", () => {
    logger.info({ tag: client.user?.tag }, "Discord bot ready");
    client.user?.setActivity("!help | !music <canción>", { type: 2 });
  });

  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;
    if (!message.guildId) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();

    try {
      switch (command) {
        case "music":
        case "play":
        case "p":
          await handleMusic(message, args);
          break;
        case "skip":
        case "s":
          await handleSkip(message);
          break;
        case "stop":
          await handleStop(message);
          break;
        case "pause":
          await handlePause(message);
          break;
        case "resume":
        case "r":
          await handleResume(message);
          break;
        case "queue":
        case "q":
          await handleQueue(message);
          break;
        case "nowplaying":
        case "np":
          await handleNowPlaying(message);
          break;
        case "help":
          await handleHelp(message);
          break;
        default:
          break;
      }
    } catch (err) {
      logger.error({ err, command }, "Unhandled command error");
    }
  });

  client.on("error", (err) => {
    logger.error({ err }, "Discord client error");
  });

  client.login(token).catch((err) => {
    logger.error({ err }, "Failed to login to Discord");
  });
}
