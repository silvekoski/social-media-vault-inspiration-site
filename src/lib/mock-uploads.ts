import { archivePosts } from "./mock-archive";
import { getMediaSpecs, type VideoSpec } from "./mock-media-specs";
import { scraperById, routingTable } from "./mock-scrapers";

// Deterministic PRNG keyed by post id so SSR + client match.
function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function prng(seed: number) {
  let a = seed || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pickW<T>(r: () => number, items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [v, w] of items) {
    x -= w;
    if (x <= 0) return v;
  }
  return items[items.length - 1][0];
}

export interface UploadDevice {
  model: string;
  os: string;
  osVersion: string;
  appVersion: string;
  capturedHdr: boolean;
}

export interface UploadNetwork {
  /** connection type at upload time */
  connection: "Wi-Fi" | "5G" | "4G LTE" | "Ethernet";
  /** measured uplink at submit, Mb/s */
  upMbps: number;
  /** measured downlink at submit, Mb/s */
  downMbps: number;
  /** round-trip latency ms */
  latencyMs: number;
  /** estimated time to upload the original file, seconds */
  uploadSec: number;
}

/** The original media the creator uploaded, before the platform re-encoded it. */
export interface OriginalMedia {
  container: string;
  videoCodec: "hevc" | "h264" | "av1";
  width: number;
  height: number;
  bitRateBps: number;
  frameRate: number;
  durationSec: number;
  fileSize: number;
  bitDepth: 8 | 10;
  hdr: "Dolby Vision" | "HDR10" | "SDR";
  audioCodec: "aac" | "opus";
  audioBitRateBps: number;
  sampleRateHz: number;
}

export interface UploadSubmission {
  id: string;
  postId: string;
  platformPostId: string;
  creatorName: string;
  submittedAt: string;
  scrapedAt: string;
  /** which scraper retrieved the delivered media */
  scraperId: string;
  /** did the operator opt in to share this submission with the maintainer */
  shared: boolean;
  device: UploadDevice;
  network: UploadNetwork;
  original: OriginalMedia;
  /** the delivered/transcoded media scraped back from the platform */
  delivered: VideoSpec;
  /** classification of what the platform did to the upload */
  verdict: "recompressed" | "downscaled" | "near-lossless";
}

const DEVICES: Array<Omit<UploadDevice, "capturedHdr"> & { hdr: boolean; codec: "hevc" | "h264"; w: number }> = [
  { model: "iPhone 15 Pro Max", os: "iOS", osVersion: "17.4.1", appVersion: "34.5.0", hdr: true, codec: "hevc", w: 12 },
  { model: "iPhone 15", os: "iOS", osVersion: "17.3", appVersion: "34.2.0", hdr: true, codec: "hevc", w: 10 },
  { model: "iPhone 14 Pro", os: "iOS", osVersion: "16.6", appVersion: "33.8.0", hdr: true, codec: "hevc", w: 9 },
  { model: "iPhone 13", os: "iOS", osVersion: "16.2", appVersion: "32.9.0", hdr: false, codec: "hevc", w: 7 },
  { model: "Pixel 8 Pro", os: "Android", osVersion: "14", appVersion: "34.4.3", hdr: true, codec: "h264", w: 8 },
  { model: "Samsung Galaxy S23", os: "Android", osVersion: "14", appVersion: "34.1.4", hdr: true, codec: "h264", w: 9 },
  { model: "Samsung Galaxy S22", os: "Android", osVersion: "13", appVersion: "33.5.0", hdr: false, codec: "h264", w: 6 },
  { model: "Pixel 7", os: "Android", osVersion: "13", appVersion: "33.2.0", hdr: false, codec: "h264", w: 5 },
  { model: "OnePlus 11", os: "Android", osVersion: "13", appVersion: "32.7.1", hdr: false, codec: "h264", w: 4 },
];

function genNetwork(r: () => number, fileBytes: number): UploadNetwork {
  const connection = pickW<UploadNetwork["connection"]>(r, [
    ["Wi-Fi", 50],
    ["5G", 28],
    ["4G LTE", 18],
    ["Ethernet", 4],
  ]);
  const profile: Record<UploadNetwork["connection"], { up: [number, number]; down: [number, number]; lat: [number, number] }> = {
    "Wi-Fi": { up: [8, 60], down: [40, 300], lat: [8, 35] },
    "5G": { up: [15, 90], down: [80, 600], lat: [12, 45] },
    "4G LTE": { up: [3, 22], down: [12, 80], lat: [30, 90] },
    Ethernet: { up: [50, 200], down: [200, 940], lat: [2, 10] },
  };
  const p = profile[connection];
  const upMbps = Math.round((p.up[0] + r() * (p.up[1] - p.up[0])) * 10) / 10;
  const downMbps = Math.round(p.down[0] + r() * (p.down[1] - p.down[0]));
  const latencyMs = Math.round(p.lat[0] + r() * (p.lat[1] - p.lat[0]));
  // time to push the original file over the measured uplink
  const uploadSec = Math.round(((fileBytes * 8) / (upMbps * 1_000_000)) * 10) / 10;
  return { connection, upMbps, downMbps, latencyMs, uploadSec };
}

let _subs: UploadSubmission[] | null = null;

export function getUploadSubmissions(): UploadSubmission[] {
  if (_subs) return _subs;

  const specs = getMediaSpecs();
  const specByPost = new Map(specs.map((s) => [s.postId, s]));

  const tiktokRoute = routingTable.find((x) => x.platform === "tiktok" && x.operation === "post");

  const out: UploadSubmission[] = [];
  for (const post of archivePosts) {
    if (post.platform !== "tiktok") continue;
    if (!(post.postType === "video" || post.postType === "reel")) continue;
    const delivered = specByPost.get(post.id);
    if (!delivered || delivered.type !== "video") continue;

    const r = prng(hashStr(post.id) ^ 0x9e3779b9);

    const dev = pickW(r, DEVICES.map((d) => [d, d.w] as [typeof d, number]));

    // The platform delivered `delivered`. Reconstruct a plausibly larger original.
    // Creators commonly film 4K/60 or 1080/60; the platform downscales + recompresses.
    const upscaleRes = pickW(r, [
      [1, 35], // same resolution as delivered, just recompressed
      [1.5, 25],
      [2, 40], // filmed at 2x linear res (e.g. 4K -> 1080)
    ]);
    const oWidth = Math.round((delivered.width * upscaleRes) / 2) * 2;
    const oHeight = Math.round((delivered.height * upscaleRes) / 2) * 2;
    // original bitrate is several times the delivered one
    const bitrateMult = 3 + r() * 9;
    const oBitrate = Math.round(delivered.bitRateBps * bitrateMult);
    const oFrameRate = pickW(r, [[30, 35], [60, 55], [24, 10]]);
    const oBitDepth: 8 | 10 = dev.hdr ? 10 : 8;
    const oHdr: OriginalMedia["hdr"] = dev.hdr
      ? dev.os === "iOS"
        ? "Dolby Vision"
        : "HDR10"
      : "SDR";
    const oFileSize = Math.round((delivered.durationSec * oBitrate) / 8);

    const original: OriginalMedia = {
      container: dev.os === "iOS" ? "mov,mp4,m4a,3gp,3g2,mj2" : "mov,mp4,m4a,3gp,3g2,mj2",
      videoCodec: dev.codec,
      width: oWidth,
      height: oHeight,
      bitRateBps: oBitrate,
      frameRate: oFrameRate,
      durationSec: delivered.durationSec,
      fileSize: oFileSize,
      bitDepth: oBitDepth,
      hdr: oHdr,
      audioCodec: "aac",
      audioBitRateBps: pickW(r, [[256000, 50], [192000, 30], [320000, 20]]),
      sampleRateHz: 48000,
    };

    const network = genNetwork(r, oFileSize);

    // scraper that retrieved the delivery: mostly primary, sometimes fallback
    const useFallback = tiktokRoute?.fallback && r() < 0.22;
    const scraperId = useFallback ? tiktokRoute!.fallback! : tiktokRoute?.primary ?? "apify-follower";

    const resChanged = oWidth !== delivered.width || oHeight !== delivered.height;
    const retention = delivered.bitRateBps / oBitrate;
    const verdict: UploadSubmission["verdict"] = resChanged
      ? "downscaled"
      : retention > 0.7
        ? "near-lossless"
        : "recompressed";

    const submittedAt = post.capturedAt;
    const scrapedAt = new Date(new Date(post.capturedAt).getTime() + Math.round((1 + r() * 40) * 60000)).toISOString();

    out.push({
      id: `up_${post.id}`,
      postId: post.id,
      platformPostId: post.platformPostId,
      creatorName: post.creatorName,
      submittedAt,
      scrapedAt,
      scraperId,
      shared: r() < 0.62,
      device: {
        model: dev.model,
        os: dev.os,
        osVersion: dev.osVersion,
        appVersion: dev.appVersion,
        capturedHdr: dev.hdr,
      },
      network,
      original,
      delivered,
      verdict,
    });
  }

  // newest first
  out.sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  _subs = out;
  return out;
}

// ---- comparison helpers ----

export interface CompareRow {
  label: string;
  original: string;
  delivered: string;
  /** optional retained/delta annotation, e.g. "12%" */
  delta?: string;
  changed: boolean;
}

function fmtMbps(bps: number) {
  return `${(bps / 1_000_000).toFixed(1)} Mb/s`;
}
function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function compareRows(s: UploadSubmission): CompareRow[] {
  const o = s.original;
  const d = s.delivered;
  const bitrateRetained = Math.round((d.bitRateBps / o.bitRateBps) * 100);
  const sizeRetained = Math.round((d.fileSize / o.fileSize) * 100);
  const oPixels = o.width * o.height;
  const dPixels = d.width * d.height;
  const pixelRetained = Math.round((dPixels / oPixels) * 100);

  return [
    {
      label: "Resolution",
      original: `${o.width}×${o.height}`,
      delivered: `${d.width}×${d.height}`,
      delta: pixelRetained < 100 ? `${pixelRetained}% px` : undefined,
      changed: o.width !== d.width || o.height !== d.height,
    },
    {
      label: "Video codec",
      original: o.videoCodec.toUpperCase(),
      delivered: d.videoCodec.toUpperCase(),
      changed: o.videoCodec !== d.videoCodec,
    },
    {
      label: "Video bitrate",
      original: fmtMbps(o.bitRateBps),
      delivered: fmtMbps(d.bitRateBps),
      delta: `${bitrateRetained}% kept`,
      changed: true,
    },
    {
      label: "Frame rate",
      original: `${o.frameRate} fps`,
      delivered: `${d.frameRate} fps`,
      changed: Math.round(o.frameRate) !== Math.round(d.frameRate),
    },
    {
      label: "Bit depth",
      original: `${o.bitDepth}-bit`,
      delivered: `${d.bitDepth}-bit`,
      changed: o.bitDepth !== d.bitDepth,
    },
    {
      label: "Dynamic range",
      original: o.hdr,
      delivered: "SDR",
      changed: o.hdr !== "SDR",
    },
    {
      label: "File size",
      original: fmtBytes(o.fileSize),
      delivered: fmtBytes(d.fileSize),
      delta: `${sizeRetained}% of original`,
      changed: true,
    },
    {
      label: "Duration",
      original: `${o.durationSec.toFixed(1)}s`,
      delivered: `${d.durationSec.toFixed(1)}s`,
      changed: false,
    },
    {
      label: "Audio codec",
      original: o.audioCodec.toUpperCase(),
      delivered: (d.audioCodec ?? "—").toString().toUpperCase(),
      changed: !!d.audioCodec && o.audioCodec !== d.audioCodec,
    },
    {
      label: "Audio bitrate",
      original: `${Math.round(o.audioBitRateBps / 1000)} kb/s`,
      delivered: d.audioBitRateBps ? `${Math.round(d.audioBitRateBps / 1000)} kb/s` : "—",
      changed: !!d.audioBitRateBps && Math.round(o.audioBitRateBps / 1000) !== Math.round(d.audioBitRateBps / 1000),
    },
  ];
}

/** Bitrate retained as a fraction 0..1 (delivered / original). */
export function bitrateRetained(s: UploadSubmission): number {
  return s.delivered.bitRateBps / s.original.bitRateBps;
}

export { fmtBytes as fmtUploadBytes, fmtMbps as fmtUploadMbps };
