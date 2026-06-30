import type { Post, Creator, EngagementSnapshot } from "./mock-data";
import { creators as baseCreators, posts as basePosts } from "./mock-data";

// Deterministic PRNG so SSR + client match.
function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260627);
const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;
const randint = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min;

// Extend creator roster up to ~60 so filtering feels real.
const extraCreatorSeeds: Array<{ u: string; d: string; p: "tiktok" | "instagram" | "youtube" }> = [
  { u: "type.studio", d: "Type Studio", p: "instagram" },
  { u: "lofi.kitchen", d: "Lofi Kitchen", p: "tiktok" },
  { u: "north.trails", d: "North Trails", p: "instagram" },
  { u: "deep.focus.fm", d: "Deep Focus FM", p: "tiktok" },
  { u: "shader.lab", d: "Shader Lab", p: "tiktok" },
  { u: "macro.gardens", d: "Macro Gardens", p: "instagram" },
  { u: "studio.kintsugi", d: "Studio Kintsugi", p: "instagram" },
  { u: "midnight.coder", d: "Midnight Coder", p: "tiktok" },
  { u: "neon.market", d: "Neon Market", p: "tiktok" },
  { u: "paper.atlas", d: "Paper Atlas", p: "instagram" },
  { u: "salt.harbour", d: "Salt Harbour", p: "instagram" },
  { u: "raw.terminal", d: "Raw Terminal", p: "tiktok" },
  { u: "feral.fonts", d: "Feral Fonts", p: "instagram" },
  { u: "sundial.co", d: "Sundial Co", p: "instagram" },
  { u: "low.poly.world", d: "Low Poly World", p: "tiktok" },
  { u: "matcha.daily", d: "Matcha Daily", p: "tiktok" },
  { u: "old.cameras", d: "Old Cameras", p: "instagram" },
  { u: "studio.brutal", d: "Studio Brutal", p: "instagram" },
  { u: "wave.signal", d: "Wave Signal", p: "tiktok" },
  { u: "atelier.noir", d: "Atelier Noir", p: "instagram" },
  { u: "kernel.panic", d: "Kernel Panic", p: "tiktok" },
  { u: "void.gallery", d: "Void Gallery", p: "instagram" },
  { u: "shutter.bug", d: "Shutter Bug", p: "instagram" },
  { u: "ramen.hours", d: "Ramen Hours", p: "tiktok" },
  { u: "pixel.pusher", d: "Pixel Pusher", p: "tiktok" },
  { u: "stone.forest", d: "Stone Forest", p: "instagram" },
  { u: "byte.kitchen", d: "Byte Kitchen", p: "tiktok" },
  { u: "amber.frames", d: "Amber Frames", p: "instagram" },
  { u: "loop.station", d: "Loop Station", p: "tiktok" },
  { u: "the.foundry", d: "The Foundry", p: "instagram" },
  { u: "sketchbook.co", d: "Sketchbook Co", p: "instagram" },
  { u: "render.farm", d: "Render Farm", p: "tiktok" },
  { u: "moss.studio", d: "Moss Studio", p: "instagram" },
  { u: "circuit.diary", d: "Circuit Diary", p: "tiktok" },
  { u: "dune.records", d: "Dune Records", p: "instagram" },
  { u: "still.life.co", d: "Still Life Co", p: "instagram" },
  { u: "midnight.fm", d: "Midnight FM", p: "tiktok" },
  { u: "wire.frame", d: "Wire Frame", p: "tiktok" },
  { u: "harbor.lights", d: "Harbor Lights", p: "instagram" },
  { u: "raster.club", d: "Raster Club", p: "instagram" },
  { u: "void.runner", d: "Void Runner", p: "tiktok" },
  { u: "cobalt.bay", d: "Cobalt Bay", p: "instagram" },
  { u: "linen.studio", d: "Linen Studio", p: "instagram" },
  { u: "feedback.loop", d: "Feedback Loop", p: "tiktok" },
  { u: "atlas.minor", d: "Atlas Minor", p: "instagram" },
  { u: "patch.notes", d: "Patch Notes", p: "tiktok" },
  { u: "warm.kettle", d: "Warm Kettle", p: "tiktok" },
  { u: "studio.tundra", d: "Studio Tundra", p: "instagram" },
  { u: "spectrum.co", d: "Spectrum Co", p: "instagram" },
  { u: "graphite.lab", d: "Graphite Lab", p: "tiktok" },
  { u: "soft.shadow", d: "Soft Shadow", p: "instagram" },
  { u: "marker.pen", d: "Marker Pen", p: "tiktok" },
  { u: "long.exposure", d: "Long Exposure", p: "instagram" },
  { u: "rain.window", d: "Rain Window", p: "instagram" },
  { u: "longform.cuts", d: "Longform Cuts", p: "youtube" },
  { u: "studio.workbench", d: "Studio Workbench", p: "youtube" },
  { u: "quiet.lectures", d: "Quiet Lectures", p: "youtube" },
  { u: "field.recordings", d: "Field Recordings", p: "youtube" },
  { u: "open.workshop", d: "Open Workshop", p: "youtube" },
  { u: "render.diary", d: "Render Diary", p: "youtube" },
  { u: "minute.physics.fan", d: "Minute Physics Fan", p: "youtube" },
  { u: "synth.bench", d: "Synth Bench", p: "youtube" },
];

const generatedCreators: Creator[] = extraCreatorSeeds.map((s, i) => ({
  id: `gc${i + 1}`,
  platform: s.p,
  username: s.u,
  displayName: s.d,
  watched: rand() > 0.4,
  active: rand() > 0.15,
  discoveredVia: rand() > 0.6 ? "watched_add" : "capture",
  postCount: randint(20, 800),
  addedAt: new Date(2024, randint(0, 5), randint(1, 28)).toISOString(),
  avatarUrl: "",
  followers: randint(2000, 1500000),
}));

export const allCreators: Creator[] = [...baseCreators, ...generatedCreators];

// Caption templates by topic vocabulary.
const captionTemplates = [
  "Behind the scenes of {topic}. Took {n} hours to get the {detail} right.",
  "Three things nobody tells you about {topic}. Save this for later.",
  "Why {topic} matters more than you think, a quick breakdown.",
  "I tried {topic} for {n} days. Here's what actually changed.",
  "The {topic} setup I keep coming back to. Simple, repeatable, cheap.",
  "Watch this before you start {topic}. Wish I knew earlier.",
  "{topic}, but make it minimal. Stripped down to what matters.",
  "An honest take on {topic}. No sponsors, no fluff.",
  "Reworked my {topic} routine. Cut the time in half.",
  "Quick tutorial: {topic} in under {n} minutes.",
  "Field notes on {topic} from a long weekend.",
  "{topic} essentials I never travel without.",
  "The {detail} changes everything about {topic}.",
  "POV: you finally understand {topic}.",
  "A small {topic} update that made a big difference.",
];

const topics = [
  "lighting", "color grading", "type hierarchy", "espresso", "film stock",
  "macro lenses", "ergonomic setups", "Tailwind utilities", "audio mixing",
  "live captures", "matte painting", "interior styling", "ramen broth",
  "vector workflows", "VS Code themes", "ceramic glazes", "Figma plugins",
  "shutter speed", "negative space", "kerning", "container queries",
  "lofi sampling", "shader graphs", "color theory", "moodboards",
  "Three.js scenes", "noise reduction", "lens flares", "manual focus",
  "code review", "darkroom prints", "Nginx configs", "watercolor washes",
];

const details = [
  "framing", "weight", "spacing", "rhythm", "balance", "contrast",
  "edge", "highlight", "shadow", "tone", "grain", "stop",
];

const hashtagPool = [
  "design", "uidesign", "uxdesign", "figma", "typography", "code",
  "css", "webdev", "frontend", "backend", "ai", "ml", "react",
  "tailwind", "minimal", "photography", "filmphoto", "analog",
  "architecture", "interior", "matcha", "coffee", "ramen", "studio",
  "ceramics", "soundtrack", "lofi", "linux", "terminal", "vim",
  "3d", "blender", "shader", "threejs", "indiehacker", "buildinpublic",
];

const postTypes: Array<"video" | "photo" | "carousel" | "reel"> = [
  "video", "photo", "carousel", "reel",
];

function genHashtags(): string[] {
  const n = randint(2, 5);
  const out = new Set<string>();
  while (out.size < n) out.add(pick(hashtagPool));
  return Array.from(out);
}

function genEngagement(date: string, scale: number): EngagementSnapshot {
  const v = randint(800, 4_500_000) * scale;
  return {
    id: `g-${date}-${randint(0, 9999)}`,
    likes: Math.floor(v * (0.03 + rand() * 0.05)),
    views: Math.floor(v),
    shares: Math.floor(v * 0.002),
    comments: Math.floor(v * 0.001),
    saves: Math.floor(v * 0.004),
    capturedAt: date,
  };
}

// Generate ~28k posts. Spread across ~18 months.
const TOTAL = 28_000;
const START = new Date("2024-01-01T00:00:00Z").getTime();
const END = new Date("2026-06-27T00:00:00Z").getTime();

const generated: Post[] = [];
for (let i = 0; i < TOTAL; i++) {
  const creator = pick(allCreators);
  const tpl = pick(captionTemplates);
  const caption = tpl
    .replace("{topic}", pick(topics))
    .replace("{detail}", pick(details))
    .replace("{n}", String(randint(2, 30)));
  const hashtags = genHashtags();
  const captionFull = caption + " " + hashtags.map((h) => "#" + h).join(" ");
  const tsMs = START + Math.floor(rand() * (END - START));
  const ts = new Date(tsMs).toISOString();
  const scale = rand() > 0.92 ? 8 : 1; // some viral outliers
  const snap = genEngagement(ts, scale);
  const type =
    creator.platform === "tiktok"
      ? rand() > 0.05
        ? "video"
        : pick(postTypes)
      : creator.platform === "youtube"
        ? rand() > 0.55
          ? "short"
          : "long"
        : pick(postTypes);

  generated.push({
    id: `g${i}`,
    platform: creator.platform,
    platformPostId: String(7_000_000_000 + i),
    creatorId: creator.id,
    creatorName: creator.username,
    postType: type as Post["postType"],
    caption: captionFull,
    hashtags,
    mediaUrls: [],
    capturedAt: ts,
    latestEngagement: snap,
    engagementHistory: [snap],
    revisions: [
      { id: `gr-${i}`, version: 1, caption: captionFull, hashtags, detectedAt: ts },
    ],
    analyses: [],
    extractionStatus: rand() > 0.97 ? "partial" : "ok",
  });
}

// Curated posts first so they remain easy to find at the top of "recent" sort.
export const archivePosts: Post[] = [...basePosts, ...generated];

export const archivePostById = new Map<string, Post>(
  archivePosts.map((p) => [p.id, p]),
);
