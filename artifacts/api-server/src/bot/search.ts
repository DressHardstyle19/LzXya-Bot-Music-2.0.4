import { ytdlpSearch, ytdlpGetInfo } from "./ytdlp.js";
import { Song } from "./queue.js";
import { logger } from "../lib/logger.js";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const YT_URL_RE = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;

export async function searchYouTube(
  query: string,
  requestedBy: string
): Promise<Song | null> {
  try {
    const info = YT_URL_RE.test(query)
      ? await ytdlpGetInfo(query)
      : await ytdlpSearch(query);

    if (!info) {
      logger.warn({ query }, "No result found");
      return null;
    }

    return {
      title: info.title,
      url: info.url,
      duration: formatDuration(info.duration),
      requestedBy,
      thumbnail: info.thumbnail,
    };
  } catch (err) {
    logger.error({ err, query }, "YouTube search failed");
    return null;
  }
}
