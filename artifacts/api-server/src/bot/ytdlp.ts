import { spawn, spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../lib/logger.js";

import { existsSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localBin = path.resolve(__dirname, "../../../bin/yt-dlp");
export const YTDLP = existsSync(localBin) ? localBin : "yt-dlp";

export interface VideoInfo {
  id: string;
  title: string;
  url: string;
  duration: number;
  thumbnail?: string;
  webpage_url: string;
}

export async function ytdlpSearch(query: string): Promise<VideoInfo | null> {
  return new Promise((resolve) => {
    const args = [
      `ytsearch1:${query}`,
      "--no-playlist",
      "-J",
      "--quiet",
      "--no-warnings",
    ];

    const proc = spawn(YTDLP, args);
    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    proc.stderr.on("data", (d: Buffer) => (stderr += d.toString()));

    proc.on("close", (code) => {
      if (code !== 0) {
        logger.error({ stderr, code }, "yt-dlp search failed");
        resolve(null);
        return;
      }
      try {
        const data = JSON.parse(stdout);
        const entry = data.entries?.[0] ?? data;
        resolve({
          id: entry.id,
          title: entry.title,
          url: entry.webpage_url ?? `https://www.youtube.com/watch?v=${entry.id}`,
          duration: entry.duration ?? 0,
          thumbnail: entry.thumbnail,
          webpage_url: entry.webpage_url,
        });
      } catch (err) {
        logger.error({ err }, "Failed to parse yt-dlp JSON");
        resolve(null);
      }
    });
  });
}

export async function ytdlpGetInfo(url: string): Promise<VideoInfo | null> {
  return new Promise((resolve) => {
    const args = [url, "--no-playlist", "-J", "--quiet", "--no-warnings"];
    const proc = spawn(YTDLP, args);
    let stdout = "";

    proc.stdout.on("data", (d: Buffer) => (stdout += d.toString()));
    proc.on("close", (code) => {
      if (code !== 0) { resolve(null); return; }
      try {
        const data = JSON.parse(stdout);
        resolve({
          id: data.id,
          title: data.title,
          url: data.webpage_url ?? url,
          duration: data.duration ?? 0,
          thumbnail: data.thumbnail,
          webpage_url: data.webpage_url,
        });
      } catch {
        resolve(null);
      }
    });
  });
}

export function ytdlpStream(url: string) {
  return spawn(YTDLP, [
    url,
    "-f", "bestaudio[ext=webm]/bestaudio/best",
    "-o", "-",
    "--quiet",
    "--no-warnings",
    "--no-playlist",
  ]);
}
