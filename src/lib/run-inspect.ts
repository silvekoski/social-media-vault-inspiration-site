import type { Run } from "./mock-data";
import { scraperById } from "./mock-scrapers";

export type LogLevel = "info" | "warning" | "error";

export interface LogLine {
  time: string;
  level: LogLevel;
  msg: string;
}

export interface RunArtifacts {
  /** Apify-style storage ids returned on the ActorRun object */
  datasetId: string;
  keyValueStoreId: string;
  requestQueueId: string;
  /** stats surfaced after a successful run */
  computeUnits: number;
  memAvgMb: number;
  runTimeSecs: number;
  build: string;
  log: LogLine[];
  datasetSample: Record<string, string | number>[];
}

/** Deterministic pseudo-random from a string seed so the same run always renders the same artifacts. */
function seeded(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hex(rng: () => number, len: number): string {
  const chars = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(rng() * 16)];
  return out;
}

export function durationLabel(run: Run): string {
  if (!run.finishedAt) return run.status === "running" ? "running…" : "—";
  const s = new Date(run.startedAt).getTime();
  const f = new Date(run.finishedAt).getTime();
  const secs = Math.round((f - s) / 1000);
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const r = secs % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

export function runTitle(run: Run): string {
  return run.id.toUpperCase();
}

function runTimeSeconds(run: Run): number {
  if (!run.finishedAt) return 0;
  return Math.max(
    1,
    Math.round(
      (new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) /
        1000,
    ),
  );
}

function clock(base: number, offsetSecs: number): string {
  const d = new Date(base + offsetSecs * 1000);
  return d.toISOString().slice(11, 19);
}

function buildLog(run: Run, rng: () => number): LogLine[] {
  const start = new Date(run.startedAt).getTime();
  const total = runTimeSeconds(run) || 30;
  const sc = scraperById[run.scraperId];
  const lines: LogLine[] = [];
  lines.push({ time: clock(start, 0), level: "info", msg: "Starting actor build and run." });
  lines.push({
    time: clock(start, 1),
    level: "info",
    msg: `System info: ${sc?.vendor ?? "scraper"} actor, memory 2048 MB.`,
  });
  lines.push({
    time: clock(start, 2),
    level: "info",
    msg: `Loading input for ${run.kind} on ${run.platform ?? "platform"}.`,
  });

  if (run.scraperFallbackFrom) {
    lines.push({
      time: clock(start, 3),
      level: "warning",
      msg: `Primary scraper ${scraperById[run.scraperFallbackFrom]?.name ?? run.scraperFallbackFrom} failed, falling back to ${sc?.name ?? run.scraperId}.`,
    });
  }

  const checkpoints = Math.min(4, Math.max(1, Math.floor(run.itemCount / 25) || 1));
  for (let i = 1; i <= checkpoints; i++) {
    const at = Math.round((total / (checkpoints + 1)) * i);
    const got = Math.round((run.itemCount / checkpoints) * i);
    lines.push({
      time: clock(start, at),
      level: rng() > 0.85 ? "warning" : "info",
      msg:
        rng() > 0.85
          ? `Rate limit hit, backing off for ${Math.ceil(rng() * 5)}s.`
          : `Scraped ${got} of ~${run.itemCount} items.`,
    });
  }

  if (run.status === "error") {
    lines.push({
      time: clock(start, total),
      level: "error",
      msg: "Run failed: target returned HTTP 429 after retries exhausted.",
    });
  } else if (run.status === "success") {
    lines.push({
      time: clock(start, total - 1),
      level: "info",
      msg: `Pushed ${run.itemCount} items to dataset.`,
    });
    lines.push({
      time: clock(start, total),
      level: "info",
      msg: "Actor finished with exit code 0 (SUCCEEDED).",
    });
  }
  return lines;
}

function buildDatasetSample(run: Run, rng: () => number): Record<string, string | number>[] {
  if (run.itemCount === 0) return [];
  const count = Math.min(5, run.itemCount);
  const rows: Record<string, string | number>[] = [];
  const platform = run.platform ?? "tiktok";

  for (let i = 0; i < count; i++) {
    if (run.kind === "discovery") {
      rows.push({
        username: `@${platform.slice(0, 2)}_creator_${hex(rng, 4)}`,
        platform,
        followers: Math.floor(rng() * 900000) + 1000,
        posts: Math.floor(rng() * 500),
      });
    } else if (run.kind === "engagement") {
      rows.push({
        postId: hex(rng, 12),
        likes: Math.floor(rng() * 200000),
        views: Math.floor(rng() * 4000000),
        comments: Math.floor(rng() * 5000),
      });
    } else {
      rows.push({
        postId: hex(rng, 12),
        type: ["video", "photo", "carousel", "reel"][Math.floor(rng() * 4)],
        mediaCount: Math.floor(rng() * 8) + 1,
        captionPreview: "Captured caption text…",
      });
    }
  }
  return rows;
}

export function buildRunArtifacts(run: Run): RunArtifacts {
  const rng = seeded(run.id);
  const runTimeSecs = runTimeSeconds(run);
  // Apify compute units ≈ (memory GB) * runtime hours; assume 2 GB.
  const computeUnits = (2 * runTimeSecs) / 3600;

  return {
    datasetId: hex(rng, 17),
    keyValueStoreId: hex(rng, 17),
    requestQueueId: hex(rng, 17),
    computeUnits: Math.max(0.001, computeUnits),
    memAvgMb: 512 + Math.floor(rng() * 1024),
    runTimeSecs,
    build: `0.${Math.floor(rng() * 9) + 1}.${Math.floor(rng() * 20)}`,
    log: buildLog(run, rng),
    datasetSample: buildDatasetSample(run, rng),
  };
}
