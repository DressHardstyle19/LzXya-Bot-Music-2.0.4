import ytdl from "ytdl-core";
import { Song } from "./queue.js";
import { logger } from "../lib/logger.js";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export async function searchYouTube(
  query: string,
  requestedBy: string
): Promise<Song | null> {
  try {
    let videoUrl: string;

    if (ytdl.validateURL(query)) {
      videoUrl = query;
    } else {
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        },
      });
      const html = await response.text();

      const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      if (!match) {
        logger.warn({ query }, "No video found for query");
        return null;
      }
      videoUrl = `https://www.youtube.com/watch?v=${match[1]}`;
    }

    const info = await ytdl.getInfo(videoUrl);
    const details = info.videoDetails;

    return {
      title: details.title,
      url: details.video_url,
      duration: formatDuration(parseInt(details.lengthSeconds, 10)),
      requestedBy,
      thumbnail: details.thumbnails?.[0]?.url,
    };
  } catch (err) {
    logger.error({ err, query }, "YouTube search failed");
    return null;
  }
}
