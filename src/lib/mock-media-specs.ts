import { archivePosts } from "./mock-archive";

// Deterministic PRNG keyed by post id (hash) so SSR + client match.
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

export type Platform = "tiktok" | "instagram" | "youtube";
export type MediaKind = "image" | "video";
// Content format normalized per platform.
// tiktok: "video" | "slideshow"
// instagram: "reel" | "video" | "photo" | "carousel"
// youtube: "short" | "long"
export type ContentFormat =
  | "video"
  | "slideshow"
  | "reel"
  | "photo"
  | "carousel"
  | "short"
  | "long";

export interface ImageSpec {
  type: "image";
  format: "jpeg" | "png" | "webp" | "heic";
  fileSize: number;
  width: number;
  height: number;
  aspectRatio: string;
  jpegQuality: number | null;
  bitsPerSample: number | null;
  colorComponents: number | null;
  chromaSubsampling: string | null;
}

export interface VideoSpec {
  type: "video";
  format: string;
  fileSize: number;
  durationSec: number;
  bitRateBps: number;
  width: number;
  height: number;
  aspectRatio: string;
  videoCodec: "h264" | "hevc" | "av1" | "vp9";
  profile: string;
  pixFmt: "yuv420p" | "yuv420p10le" | "yuv444p";
  bitDepth: 8 | 10;
  chromaSubsampling: "4:2:0" | "4:2:2" | "4:4:4";
  frameRate: number;
  audioCodec: "aac" | "opus" | "mp3" | null;
  sampleRateHz: number | null;
  channels: number | null;
  audioBitRateBps: number | null;
  loudnessLufs: number | null;
  truePeakDb: number | null;
}

type SpecMeta = {
  postId: string;
  platform: Platform;
  contentFormat: ContentFormat;
  capturedAt: string;
};
export type MediaSpec = (ImageSpec & SpecMeta) | (VideoSpec & SpecMeta);

function pickW<T>(r: () => number, items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [v, w] of items) {
    x -= w;
    if (x <= 0) return v;
  }
  return items[items.length - 1][0];
}

function aspectLabel(w: number, h: number): string {
  const ratios: [string, number][] = [
    ["9:16", 9 / 16],
    ["4:5", 4 / 5],
    ["1:1", 1],
    ["4:3", 4 / 3],
    ["3:2", 3 / 2],
    ["16:9", 16 / 9],
    ["2:3", 2 / 3],
  ];
  const r = w / h;
  let best = ratios[0];
  let bestD = Infinity;
  for (const x of ratios) {
    const d = Math.abs(x[1] - r);
    if (d < bestD) {
      bestD = d;
      best = x;
    }
  }
  return best[0];
}

function genImage(r: () => number, platform: Platform): Omit<ImageSpec, never> {
  const format = pickW<ImageSpec["format"]>(r, [
    ["jpeg", platform === "instagram" ? 70 : 55],
    ["webp", 18],
    ["png", 10],
    ["heic", 4],
  ]);
  const resolutions: [number, number, number][] =
    platform === "instagram"
      ? [
          [1080, 1350, 40],
          [1080, 1080, 25],
          [1080, 1920, 15],
          [1440, 1800, 10],
          [720, 900, 10],
        ]
      : [
          [1080, 1920, 60],
          [720, 1280, 20],
          [1080, 1080, 10],
          [540, 960, 10],
        ];
  const res = pickW(r, resolutions.map(([w, h, p]) => [[w, h] as [number, number], p]));
  const [width, height] = res;
  const isJpeg = format === "jpeg";
  return {
    type: "image",
    format,
    fileSize: Math.floor(50_000 + r() * 800_000),
    width,
    height,
    aspectRatio: aspectLabel(width, height),
    jpegQuality: isJpeg ? pickW(r, [[85, 30], [90, 35], [92, 20], [95, 10], [80, 5]]) : null,
    bitsPerSample: isJpeg ? 8 : null,
    colorComponents: isJpeg ? 3 : null,
    chromaSubsampling: isJpeg
      ? pickW(r, [["4:2:0", 70], ["4:2:2", 25], ["4:4:4", 5]])
      : null,
  };
}

function genVideo(r: () => number, platform: Platform): Omit<VideoSpec, never> {
  const codec = pickW<VideoSpec["videoCodec"]>(r, [
    ["h264", platform === "tiktok" ? 75 : 65],
    ["hevc", 20],
    ["av1", 8],
    ["vp9", 4],
  ]);
  const resolutions: [number, number, number][] =
    platform === "youtube"
      ? [
          [1920, 1080, 55],
          [2560, 1440, 15],
          [3840, 2160, 10],
          [1280, 720, 15],
          [1080, 1920, 5],
        ]
      : [
          [1080, 1920, 60],
          [720, 1280, 25],
          [540, 960, 10],
          [1080, 1080, 5],
        ];
  const res = pickW(r, resolutions.map(([w, h, p]) => [[w, h] as [number, number], p]));
  const [width, height] = res;
  const frameRate = pickW(r, [[30, 50], [29.97, 15], [24, 10], [25, 5], [60, 20]]);
  const duration = platform === "youtube" ? 8 + r() * 1200 : 3 + r() * 90;
  const bitRate = Math.floor((codec === "h264" ? 5_500_000 : 3_800_000) * (0.6 + r() * 1.2));
  const bitDepth = pickW<8 | 10>(r, [[8, 90], [10, 10]]);
  const pixFmt = bitDepth === 10 ? "yuv420p10le" : (pickW(r, [["yuv420p", 95], ["yuv444p", 5]]) as VideoSpec["pixFmt"]);
  const hasAudio = r() > 0.05;
  const audioCodec = hasAudio
    ? pickW<NonNullable<VideoSpec["audioCodec"]>>(r, [["aac", 80], ["opus", 12], ["mp3", 8]])
    : null;
  const loudness = hasAudio ? -(8 + r() * 14) : null;
  return {
    type: "video",
    format: pickW(r, [
      ["mov,mp4,m4a,3gp,3g2,mj2", 80],
      ["matroska,webm", 12],
      ["mpegts", 8],
    ]),
    fileSize: Math.floor(duration * bitRate / 8),
    durationSec: Math.round(duration * 100) / 100,
    bitRateBps: bitRate,
    width,
    height,
    aspectRatio: aspectLabel(width, height),
    videoCodec: codec,
    profile: codec === "h264" ? pickW(r, [["High", 70], ["Main", 25], ["Baseline", 5]]) : codec === "hevc" ? "Main10" : ",",
    pixFmt,
    bitDepth,
    chromaSubsampling: pickW(r, [["4:2:0", 92], ["4:2:2", 6], ["4:4:4", 2]]),
    frameRate,
    audioCodec,
    sampleRateHz: hasAudio ? pickW(r, [[44100, 50], [48000, 50]]) : null,
    channels: hasAudio ? pickW(r, [[2, 90], [1, 10]]) : null,
    audioBitRateBps: hasAudio ? pickW(r, [[96000, 10], [128000, 55], [160000, 20], [192000, 15]]) : null,
    loudnessLufs: loudness !== null ? Math.round(loudness * 10) / 10 : null,
    truePeakDb: hasAudio ? Math.round(-(0.2 + r() * 2.5) * 10) / 10 : null,
  };
}

let _specs: MediaSpec[] | null = null;
function deriveFormat(platform: Platform, postType: string): ContentFormat {
  if (platform === "tiktok") {
    return postType === "video" || postType === "reel" ? "video" : "slideshow";
  }
  if (platform === "youtube") {
    return postType === "short" ? "short" : "long";
  }
  if (postType === "reel") return "reel";
  if (postType === "video") return "video";
  if (postType === "carousel") return "carousel";
  return "photo";
}

export function getMediaSpecs(): MediaSpec[] {
  if (_specs) return _specs;
  const out: MediaSpec[] = [];
  for (const p of archivePosts) {
    const r = prng(hashStr(p.id));
    const kind: MediaKind = p.postType === "photo" || p.postType === "carousel" ? "image" : "video";
    const platform = p.platform as Platform;
    const format = deriveFormat(platform, p.postType);
    const meta: SpecMeta = { postId: p.id, platform, contentFormat: format, capturedAt: p.capturedAt };
    if (kind === "image") {
      out.push({ ...genImage(r, platform), ...meta });
    } else {
      out.push({ ...genVideo(r, platform), ...meta });
    }
  }
  _specs = out;
  return out;
}
