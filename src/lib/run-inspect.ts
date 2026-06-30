import type { Run } from "./mock-data";
import { scraperById } from "./mock-scrapers";

export type LogLevel = "info" | "warning" | "error";

export interface LogLine {
  time: string;
  level: LogLevel;
  msg: string;
}

export type ProviderKind =
  | "apify"
  | "brightdata"
  | "floxy"
  | "internal"
  | "googleapi";

/** A label/value pair rendered in the inspector grids. */
export interface KV {
  label: string;
  value: string;
  /** show a copy affordance for opaque identifiers */
  copy?: boolean;
}

export interface RunArtifacts {
  provider: ProviderKind;
  /** Name of the run object this provider returns, e.g. "ActorRun", "Snapshot". */
  objectLabel: string;
  /** Provider-native terminal status, e.g. SUCCEEDED, ready, 200 OK. */
  statusLabel: string;
  runTimeSecs: number;
  /** Statistics grid. */
  stats: KV[];
  /** Storage / delivery grid. */
  storage: KV[];
  /** Info tab grid. */
  info: KV[];
  /** Execution log; empty for providers that do not stream one (REST APIs). */
  log: LogLine[];
  hasLog: boolean;
  /** Heading for the output tab, e.g. "Dataset", "Snapshot records". */
  outputLabel: string;
  /** Delivery descriptor for export-style providers, else null. */
  delivery: { format: string; destination: string } | null;
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

function alnum(rng: () => number, len: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(rng() * chars.length)];
  return out;
}

function base64ish(rng: () => number, len: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(rng() * chars.length)];
  return out;
}

export function providerKind(vendor: string | undefined): ProviderKind {
  switch (vendor) {
    case "Bright Data":
      return "brightdata";
    case "Floxy":
      return "floxy";
    case "Internal":
      return "internal";
    case "Google":
      return "googleapi";
    case "Apify":
    case "ApiDojo": // hosted on the Apify platform, returns ActorRun objects
    default:
      return "apify";
  }
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

function fmtInt(n: number): string {
  return n.toLocaleString();
}

function aiCostOf(run: Run): number {
  return Object.values(run.aiCost).reduce((a, b) => a + b, 0);
}

/* ------------------------------ Logs ------------------------------ */

function startupLines(run: Run, start: number, vendorLabel: string): LogLine[] {
  return [
    { time: clock(start, 0), level: "info", msg: `Initialising ${vendorLabel} job.` },
    {
      time: clock(start, 1),
      level: "info",
      msg: `Loading input for ${run.kind} on ${run.platform ?? "platform"}.`,
    },
  ];
}

function fallbackLine(run: Run, start: number): LogLine | null {
  if (!run.scraperFallbackFrom) return null;
  const from = scraperById[run.scraperFallbackFrom]?.name ?? run.scraperFallbackFrom;
  const to = scraperById[run.scraperId]?.name ?? run.scraperId;
  return {
    time: clock(start, 2),
    level: "warning",
    msg: `Primary scraper ${from} failed, falling back to ${to}.`,
  };
}

function progressLines(run: Run, start: number, total: number, rng: () => number): LogLine[] {
  const out: LogLine[] = [];
  const checkpoints = Math.min(4, Math.max(1, Math.floor(run.itemCount / 25) || 1));
  for (let i = 1; i <= checkpoints; i++) {
    const at = Math.round((total / (checkpoints + 1)) * i);
    const got = Math.round((run.itemCount / checkpoints) * i);
    const rateLimited = rng() > 0.85;
    out.push({
      time: clock(start, at),
      level: rateLimited ? "warning" : "info",
      msg: rateLimited
        ? `Rate limit hit, backing off for ${Math.ceil(rng() * 5)}s.`
        : `Scraped ${got} of ~${run.itemCount} items.`,
    });
  }
  return out;
}

function apifyLog(run: Run, rng: () => number): LogLine[] {
  const start = new Date(run.startedAt).getTime();
  const total = runTimeSeconds(run) || 30;
  const sc = scraperById[run.scraperId];
  const lines: LogLine[] = [
    { time: clock(start, 0), level: "info", msg: "Starting actor build and run." },
    {
      time: clock(start, 1),
      level: "info",
      msg: `System info: ${sc?.vendor ?? "Apify"} actor, memory 2048 MB.`,
    },
    {
      time: clock(start, 2),
      level: "info",
      msg: `Loading input for ${run.kind} on ${run.platform ?? "platform"}.`,
    },
  ];
  const fb = fallbackLine(run, start);
  if (fb) lines.push({ ...fb, time: clock(start, 3) });
  lines.push(...progressLines(run, start, total, rng));
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

function brightDataLog(run: Run, errors: number, destination: string): LogLine[] {
  const start = new Date(run.startedAt).getTime();
  const total = runTimeSeconds(run) || 30;
  const lines: LogLine[] = [
    { time: clock(start, 0), level: "info", msg: "Snapshot requested, status: building." },
    { time: clock(start, 1), level: "info", msg: "Collector dispatched to residential proxy pool." },
  ];
  const fb = fallbackLine(run, start);
  if (fb) lines.push(fb);
  lines.push({
    time: clock(start, Math.round(total * 0.5)),
    level: "info",
    msg: `Collected ${fmtInt(run.itemCount)} records.`,
  });
  if (errors > 0) {
    lines.push({
      time: clock(start, Math.round(total * 0.7)),
      level: "warning",
      msg: `${errors} input rows failed validation and were skipped.`,
    });
  }
  if (run.status === "error") {
    lines.push({ time: clock(start, total), level: "error", msg: "Snapshot failed: collector errored out." });
  } else if (run.status === "success") {
    lines.push({ time: clock(start, total - 1), level: "info", msg: "Snapshot status: ready." });
    lines.push({ time: clock(start, total), level: "info", msg: `Delivered snapshot to ${destination}.` });
  }
  return lines;
}

function floxyLog(run: Run, rng: () => number): LogLine[] {
  const start = new Date(run.startedAt).getTime();
  const total = runTimeSeconds(run) || 30;
  const lines: LogLine[] = [...startupLines(run, start, "Floxy")];
  const fb = fallbackLine(run, start);
  if (fb) lines.push(fb);
  lines.push(...progressLines(run, start, total, rng));
  if (run.status === "error") {
    lines.push({ time: clock(start, total), level: "error", msg: "Task failed: max retries exceeded." });
  } else if (run.status === "success") {
    lines.push({ time: clock(start, total), level: "info", msg: `Task finished, ${fmtInt(run.itemCount)} results ready.` });
  }
  return lines;
}

function internalLog(run: Run, blocked: number, rotations: number): LogLine[] {
  const start = new Date(run.startedAt).getTime();
  const total = runTimeSeconds(run) || 30;
  const lines: LogLine[] = [
    { time: clock(start, 0), level: "info", msg: "Opening session with rotated cookie jar." },
    { time: clock(start, 1), level: "info", msg: `Using residential proxy, ${rotations} rotations planned.` },
  ];
  const fb = fallbackLine(run, start);
  if (fb) lines.push(fb);
  if (blocked > 0) {
    lines.push({
      time: clock(start, Math.round(total * 0.6)),
      level: "warning",
      msg: `${blocked} requests soft-blocked, rotating session and retrying.`,
    });
  }
  if (run.status === "error") {
    lines.push({ time: clock(start, total), level: "error", msg: "Session terminated: hard block (captcha wall)." });
  } else if (run.status === "success") {
    lines.push({ time: clock(start, total), level: "info", msg: `Collected ${fmtInt(run.itemCount)} items, session closed.` });
  }
  return lines;
}

/* ------------------------------ Dataset sample ------------------------------ */

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

/* ------------------------------ Per-provider builders ------------------------------ */

function statusFor(run: Run, ok: string, fail: string): string {
  if (run.status === "success") return ok;
  if (run.status === "error") return fail;
  if (run.status === "running") return "RUNNING";
  return run.status;
}

function buildApify(run: Run, rng: () => number, runTimeSecs: number): RunArtifacts {
  const computeUnits = Math.max(0.001, (2 * runTimeSecs) / 3600);
  const memAvgMb = 512 + Math.floor(rng() * 1024);
  const actId = alnum(rng, 17);
  return {
    provider: "apify",
    objectLabel: "ActorRun",
    statusLabel: statusFor(run, "SUCCEEDED", "FAILED"),
    runTimeSecs,
    stats: [
      { label: "Dataset items", value: fmtInt(run.itemCount) },
      { label: "Compute units", value: computeUnits.toFixed(3) },
      { label: "Avg memory", value: `${memAvgMb} MB` },
      { label: "Run time", value: `${runTimeSecs}s` },
      { label: "Scraper cost", value: `$${run.scraperCost.toFixed(2)}` },
      { label: "AI cost", value: `$${aiCostOf(run).toFixed(2)}` },
    ],
    storage: [
      { label: "Default dataset", value: alnum(rng, 17), copy: true },
      { label: "Key-value store", value: alnum(rng, 17), copy: true },
      { label: "Request queue", value: alnum(rng, 17), copy: true },
    ],
    info: [
      { label: "Actor ID", value: actId, copy: true },
      { label: "Build", value: `0.${Math.floor(rng() * 9) + 1}.${Math.floor(rng() * 20)}` },
      { label: "Exit code", value: run.status === "success" ? "0" : run.status === "error" ? "1" : "—" },
      { label: "Origin", value: run.triggeredBy ? "API" : "SCHEDULER" },
      { label: "Memory limit", value: "2048 MB" },
      { label: "Timeout", value: "3600s" },
    ],
    log: apifyLog(run, rng),
    hasLog: true,
    outputLabel: "Dataset",
    delivery: null,
    datasetSample: buildDatasetSample(run, rng),
  };
}

function buildBrightData(run: Run, rng: () => number, runTimeSecs: number): RunArtifacts {
  const errors = run.status === "error" ? Math.floor(rng() * 40) + 5 : Math.floor(rng() * 6);
  const warnings = Math.floor(rng() * 10);
  const format = ["JSON", "NDJSON", "CSV"][Math.floor(rng() * 3)];
  const destination = ["API download", "S3 bucket", "Webhook"][Math.floor(rng() * 3)];
  const snapshotId = `s_${hex(rng, 13)}`;
  const datasetId = `gd_${hex(rng, 16)}`;
  return {
    provider: "brightdata",
    objectLabel: "Snapshot",
    statusLabel: statusFor(run, "ready", "failed"),
    runTimeSecs,
    stats: [
      { label: "Records", value: fmtInt(run.itemCount) },
      { label: "Errors", value: fmtInt(errors) },
      { label: "Warnings", value: fmtInt(warnings) },
      { label: "Run time", value: `${runTimeSecs}s` },
      { label: "Cost", value: `$${run.scraperCost.toFixed(2)}` },
      { label: "Billing", value: "per record" },
    ],
    storage: [
      { label: "Snapshot ID", value: snapshotId, copy: true },
      { label: "Dataset ID", value: datasetId, copy: true },
      { label: "Delivery format", value: format },
      { label: "Destination", value: destination },
    ],
    info: [
      { label: "Snapshot ID", value: snapshotId, copy: true },
      { label: "Dataset ID", value: datasetId, copy: true },
      { label: "Format", value: format },
      { label: "Destination", value: destination },
      { label: "Records", value: fmtInt(run.itemCount) },
      { label: "Errors", value: fmtInt(errors) },
    ],
    log: brightDataLog(run, errors, destination),
    hasLog: true,
    outputLabel: "Snapshot records",
    delivery: run.status === "success" ? { format, destination } : null,
    datasetSample: buildDatasetSample(run, rng),
  };
}

function buildFloxy(run: Run, rng: () => number, runTimeSecs: number): RunArtifacts {
  const credits = Math.max(1, Math.round(run.itemCount * (1 + rng())));
  const concurrency = [2, 4, 8][Math.floor(rng() * 3)];
  const taskId = `task_${hex(rng, 16)}`;
  return {
    provider: "floxy",
    objectLabel: "Task",
    statusLabel: statusFor(run, "finished", "failed"),
    runTimeSecs,
    stats: [
      { label: "Results", value: fmtInt(run.itemCount) },
      { label: "Credits used", value: fmtInt(credits) },
      { label: "Concurrency", value: `${concurrency}` },
      { label: "Run time", value: `${runTimeSecs}s` },
      { label: "Cost", value: `$${run.scraperCost.toFixed(2)}` },
      { label: "AI cost", value: `$${aiCostOf(run).toFixed(2)}` },
    ],
    storage: [
      { label: "Task ID", value: taskId, copy: true },
      { label: "Results URL", value: `https://api.floxy.io/v1/tasks/${taskId}/results`, copy: true },
    ],
    info: [
      { label: "Task ID", value: taskId, copy: true },
      { label: "Credits used", value: fmtInt(credits) },
      { label: "Concurrency", value: `${concurrency}` },
      { label: "Status", value: statusFor(run, "finished", "failed") },
      { label: "Format", value: "JSON" },
    ],
    log: floxyLog(run, rng),
    hasLog: true,
    outputLabel: "Results",
    delivery: null,
    datasetSample: buildDatasetSample(run, rng),
  };
}

function buildInternal(run: Run, rng: () => number, runTimeSecs: number): RunArtifacts {
  const requests = run.itemCount + Math.floor(rng() * run.itemCount * 0.4);
  const blocked = run.status === "error" ? Math.floor(rng() * 30) + 10 : Math.floor(rng() * 8);
  const rotations = Math.max(1, Math.floor(requests / 50));
  const sessionId = `sess_${hex(rng, 12)}`;
  return {
    provider: "internal",
    objectLabel: "Session scrape",
    statusLabel: statusFor(run, "completed", "failed"),
    runTimeSecs,
    stats: [
      { label: "Items", value: fmtInt(run.itemCount) },
      { label: "Requests made", value: fmtInt(requests) },
      { label: "Blocked", value: fmtInt(blocked) },
      { label: "Proxy rotations", value: fmtInt(rotations) },
      { label: "Run time", value: `${runTimeSecs}s` },
      { label: "Cost", value: "$0.00 (internal)" },
    ],
    storage: [
      { label: "Session ID", value: sessionId, copy: true },
      { label: "Output file", value: `s3://vault-internal/${run.id}/items.ndjson`, copy: true },
    ],
    info: [
      { label: "Session ID", value: sessionId, copy: true },
      { label: "Requests", value: fmtInt(requests) },
      { label: "Blocked", value: fmtInt(blocked) },
      { label: "Cookie rotations", value: fmtInt(rotations) },
      { label: "Proxy pool", value: "residential-rotating" },
      { label: "Auth", value: "session_cookie" },
    ],
    log: internalLog(run, blocked, rotations),
    hasLog: true,
    outputLabel: "Items",
    delivery: null,
    datasetSample: buildDatasetSample(run, rng),
  };
}

function buildGoogleApi(run: Run, rng: () => number, runTimeSecs: number): RunArtifacts {
  // YouTube Data API: list calls cost 1 unit/page, search costs 100 units.
  const pages = Math.max(1, Math.ceil(run.itemCount / 50));
  const quotaUnits = (run.kind === "discovery" ? 100 : 0) + pages;
  const totalResults = run.itemCount + Math.floor(rng() * 500);
  const etag = `"${base64ish(rng, 27)}"`;
  const nextPageToken = run.itemCount >= 50 ? base64ish(rng, 16) : "—";
  const kindMap: Record<string, string> = {
    discovery: "youtube#searchListResponse",
    engagement: "youtube#videoListResponse",
    capture: "youtube#videoListResponse",
  };
  const kind = kindMap[run.kind] ?? "youtube#videoListResponse";
  return {
    provider: "googleapi",
    objectLabel: "API response",
    statusLabel: statusFor(run, "200 OK", run.status === "error" ? "403 quotaExceeded" : "error"),
    runTimeSecs,
    stats: [
      { label: "Items returned", value: fmtInt(run.itemCount) },
      { label: "Quota units", value: fmtInt(quotaUnits) },
      { label: "Total results", value: fmtInt(totalResults) },
      { label: "Results / page", value: "50" },
      { label: "Run time", value: `${runTimeSecs}s` },
      { label: "Cost", value: "$0.00 (quota)" },
    ],
    storage: [
      { label: "ETag", value: etag, copy: true },
      { label: "Next page token", value: nextPageToken, copy: nextPageToken !== "—" },
    ],
    info: [
      { label: "kind", value: kind },
      { label: "ETag", value: etag, copy: true },
      { label: "Quota cost", value: `${fmtInt(quotaUnits)} units` },
      { label: "Total results", value: fmtInt(totalResults) },
      { label: "Results per page", value: "50" },
      { label: "API version", value: "v3" },
    ],
    log: [],
    hasLog: false,
    outputLabel: "API items",
    delivery: null,
    datasetSample: buildDatasetSample(run, rng),
  };
}

export function buildRunArtifacts(run: Run): RunArtifacts {
  const rng = seeded(run.id);
  const runTimeSecs = runTimeSeconds(run);
  const kind = providerKind(scraperById[run.scraperId]?.vendor);

  switch (kind) {
    case "brightdata":
      return buildBrightData(run, rng, runTimeSecs);
    case "floxy":
      return buildFloxy(run, rng, runTimeSecs);
    case "internal":
      return buildInternal(run, rng, runTimeSecs);
    case "googleapi":
      return buildGoogleApi(run, rng, runTimeSecs);
    case "apify":
    default:
      return buildApify(run, rng, runTimeSecs);
  }
}
