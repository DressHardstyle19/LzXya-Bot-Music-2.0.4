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
    let videoInfo: Awaited<ReturnType<typeof playdl.video_info>> | null = null;

    if (playdl.yt_validate(query) === "video") {
      videoInfo = await playdl.video_info(query);
    } else {
      const results = await playdl.search(query, { source: { youtube: "video" }, limit: 1 });
      if (!results.length) {
        logger.warn({ query }, "No video found for query");
        return null;
      }
      videoInfo = await playdl.video_info(results[0].url);
    }

    if (!videoInfo) return null;

    const details = videoInfo.video_details;

    return {
      title: details.title ?? "Unknown",
      url: details.url,
      duration: formatDuration(details.durationInSec),
      requestedBy,
      thumbnail: details.thumbnails?.[0]?.url,
    };
  } catch (err) {
    logger.error({ err, query }, "YouTube search failed");
    return null;
  }
}
