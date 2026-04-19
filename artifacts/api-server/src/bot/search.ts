import playdl from "play-dl";
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
    let title: string;
    let durationSec: number;
    let thumbnail: string | undefined;

    if (playdl.yt_validate(query) === "video") {
      videoUrl = query;
      const info = await playdl.video_basic_info(videoUrl);
      title = info.video_details.title ?? "Unknown";
      durationSec = info.video_details.durationInSec;
      thumbnail = info.video_details.thumbnails?.[0]?.url;
    } else {
      const results = await playdl.search(query, {
        source: { youtube: "video" },
        limit: 1,
      });

      if (!results.length) {
        logger.warn({ query }, "No video found for query");
        return null;
      }

      const top = results[0];
      videoUrl = top.url;
      title = top.title ?? "Unknown";
      durationSec = top.durationInSec ?? 0;
      thumbnail = top.thumbnails?.[0]?.url;
    }

    return {
      title,
      url: videoUrl,
      duration: formatDuration(durationSec),
      requestedBy,
      thumbnail,
    };
  } catch (err) {
    logger.error({ err, query }, "YouTube search failed");
    return null;
  }
}
