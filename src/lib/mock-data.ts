export interface Creator {
  id: string;
  platform: "tiktok" | "instagram" | "youtube";
  username: string;
  displayName: string;
  watched: boolean;
  active: boolean;
  discoveredVia: "watched_add" | "capture";
  postCount: number;
  addedAt: string;
  avatarUrl: string;
  followers: number;
}

export interface Run {
  id: string;
  kind: "discovery" | "engagement" | "capture";
  status: "pending" | "running" | "success" | "error" | "cancelled";
  platform?: string;
  /** which scraper provider executed this run */
  scraperId: string;
  /** if the primary failed and we switched, the original id */
  scraperFallbackFrom?: string;
  startedAt: string;
  finishedAt?: string;
  itemCount: number;
  /** scraper cost in USD (provider-agnostic) */
  scraperCost: number;
  aiCost: Record<string, number>;
  triggeredBy?: string;
}

export interface Post {
  id: string;
  platform: "tiktok" | "instagram" | "youtube";
  platformPostId: string;
  creatorId: string;
  creatorName: string;
  postType: "video" | "photo" | "carousel" | "reel" | "short" | "long";
  caption: string;
  hashtags: string[];
  mediaUrls: string[];
  capturedAt: string;
  latestEngagement: EngagementSnapshot;
  engagementHistory: EngagementSnapshot[];
  revisions: Revision[];
  analyses: Analysis[];
  extractionStatus: "ok" | "partial" | "failed";
}

export interface EngagementSnapshot {
  id: string;
  likes: number;
  views: number;
  shares: number;
  comments: number;
  saves: number;
  capturedAt: string;
}

export interface Revision {
  id: string;
  version: number;
  caption: string;
  hashtags: string[];
  detectedAt: string;
}

export interface Analysis {
  id: string;
  promptName: string;
  provider: "gemini" | "openai" | "openrouter";
  model: string;
  status: "pending" | "running" | "ready" | "failed";
  output?: string;
  costEstimate: number;
  completedAt?: string;
}

export interface Prompt {
  id: string;
  name: string;
  provider: "gemini" | "openai" | "openrouter";
  model: string;
  promptText: string;
  appliesTo: "image" | "video" | "both";
  currentVersion: number;
  versionCount: number;
}

export const creators: Creator[] = [
  { id: "c1", platform: "tiktok", username: "design_daily", displayName: "Design Daily", watched: true, active: true, discoveredVia: "watched_add", postCount: 142, addedAt: "2024-03-15T10:00:00Z", avatarUrl: "", followers: 284000 },
  { id: "c2", platform: "instagram", username: "minimal.arch", displayName: "Minimal Architecture", watched: true, active: true, discoveredVia: "watched_add", postCount: 89, addedAt: "2024-04-02T14:30:00Z", avatarUrl: "", followers: 156000 },
  { id: "c3", platform: "tiktok", username: "tech_reviewz", displayName: "Tech Reviewz", watched: true, active: false, discoveredVia: "watched_add", postCount: 210, addedAt: "2024-01-20T09:15:00Z", avatarUrl: "", followers: 512000 },
  { id: "c4", platform: "instagram", username: "film.grain.co", displayName: "Film Grain Co", watched: false, active: true, discoveredVia: "capture", postCount: 12, addedAt: "2024-06-10T16:45:00Z", avatarUrl: "", followers: 43000 },
  { id: "c5", platform: "tiktok", username: "code.aesthetic", displayName: "Code Aesthetic", watched: true, active: true, discoveredVia: "watched_add", postCount: 340, addedAt: "2024-02-28T11:00:00Z", avatarUrl: "", followers: 890000 },
  { id: "c6", platform: "instagram", username: "urban.frames", displayName: "Urban Frames", watched: false, active: false, discoveredVia: "capture", postCount: 5, addedAt: "2024-06-18T08:20:00Z", avatarUrl: "", followers: 12000 },
  { id: "c7", platform: "youtube", username: "deepfocus.studio", displayName: "Deep Focus Studio", watched: true, active: true, discoveredVia: "watched_add", postCount: 78, addedAt: "2024-05-04T12:00:00Z", avatarUrl: "", followers: 420000 },
  { id: "c8", platform: "youtube", username: "shortcut.lab", displayName: "Shortcut Lab", watched: true, active: true, discoveredVia: "watched_add", postCount: 215, addedAt: "2024-02-11T09:30:00Z", avatarUrl: "", followers: 95000 },
];

export const runs: Run[] = [
  { id: "r1", kind: "discovery", status: "running", platform: "tiktok", scraperId: "tiktok-internal", startedAt: "2024-06-27T10:05:00Z", itemCount: 47, scraperCost: 0.0, aiCost: { gemini: 0.12, openai: 0.05 }, triggeredBy: "operator_1" },
  { id: "r2", kind: "engagement", status: "success", platform: "instagram", scraperId: "apify-follower", startedAt: "2024-06-27T08:00:00Z", finishedAt: "2024-06-27T08:14:00Z", itemCount: 156, scraperCost: 1.87, aiCost: {}, triggeredBy: undefined },
  { id: "r3", kind: "capture", status: "success", scraperId: "brightdata-ig", platform: "instagram", startedAt: "2024-06-27T09:30:00Z", finishedAt: "2024-06-27T09:32:00Z", itemCount: 1, scraperCost: 0.08, aiCost: { gemini: 0.03 }, triggeredBy: "operator_2" },
  { id: "r4", kind: "discovery", status: "success", platform: "tiktok", scraperId: "apify-follower", scraperFallbackFrom: "tiktok-internal", startedAt: "2024-06-26T22:00:00Z", finishedAt: "2024-06-26T22:18:00Z", itemCount: 92, scraperCost: 5.11, aiCost: { openai: 0.21 }, triggeredBy: undefined },
  { id: "r5", kind: "engagement", status: "success", platform: "tiktok", scraperId: "tiktok-internal", startedAt: "2024-06-26T14:00:00Z", finishedAt: "2024-06-26T14:22:00Z", itemCount: 412, scraperCost: 0.0, aiCost: {}, triggeredBy: undefined },
  { id: "r6", kind: "discovery", status: "error", platform: "instagram", scraperId: "floxy-ig", startedAt: "2024-06-25T22:00:00Z", finishedAt: "2024-06-25T22:05:00Z", itemCount: 0, scraperCost: 0.02, aiCost: {}, triggeredBy: undefined },
  { id: "r7", kind: "capture", status: "success", platform: "youtube", scraperId: "youtube-data-api", startedAt: "2024-06-27T11:10:00Z", finishedAt: "2024-06-27T11:11:00Z", itemCount: 1, scraperCost: 0.0, aiCost: { gemini: 0.04 }, triggeredBy: "operator_1" },
  { id: "r8", kind: "discovery", status: "success", platform: "youtube", scraperId: "apify-youtube", startedAt: "2024-06-27T03:00:00Z", finishedAt: "2024-06-27T03:21:00Z", itemCount: 64, scraperCost: 1.92, aiCost: { gemini: 0.18 }, triggeredBy: undefined },
];

function makeEngagement(likes: number, views: number, shares: number, comments: number, saves: number, date: string): EngagementSnapshot {
  return { id: `es-${date}`, likes, views, shares, comments, saves, capturedAt: date };
}

export const posts: Post[] = [
  {
    id: "p1", platform: "tiktok", platformPostId: "7291002819", creatorId: "c1", creatorName: "design_daily",
    postType: "video", caption: "The grid system behind every great UI \u2014 a 60-second breakdown of alignment tricks most designers miss. #uidesign #figma #designsystems",
    hashtags: ["uidesign", "figma", "designsystems"], mediaUrls: [],
    capturedAt: "2024-06-27T09:30:00Z",
    latestEngagement: makeEngagement(48200, 1200000, 3400, 890, 1200, "2024-06-27T09:30:00Z"),
    engagementHistory: [
      makeEngagement(1200, 45000, 89, 34, 56, "2024-06-20T10:00:00Z"),
      makeEngagement(8400, 312000, 520, 210, 340, "2024-06-23T10:00:00Z"),
      makeEngagement(24100, 680000, 1800, 520, 720, "2024-06-25T10:00:00Z"),
      makeEngagement(48200, 1200000, 3400, 890, 1200, "2024-06-27T09:30:00Z"),
    ],
    revisions: [
      { id: "rv1", version: 1, caption: "Grid system tips for UI designers", hashtags: ["uidesign"], detectedAt: "2024-06-20T10:00:00Z" },
      { id: "rv2", version: 2, caption: "The grid system behind every great UI \u2014 a 60-second breakdown of alignment tricks most designers miss. #uidesign #figma #designsystems", hashtags: ["uidesign", "figma", "designsystems"], detectedAt: "2024-06-25T10:00:00Z" },
    ],
    analyses: [
      { id: "a1", promptName: "Brand Cues Extract", provider: "gemini", model: "gemini-3.1-pro-preview", status: "ready", output: "Identified 4 brand elements: consistent grid spacing (8px), neutral palette (#0A0A0A, #FAFAFA), sans-serif typography, and modular card composition. Confidence: 0.94", costEstimate: 0.03, completedAt: "2024-06-27T09:31:00Z" },
    ],
    extractionStatus: "ok",
  },
  {
    id: "p2", platform: "instagram", platformPostId: "3382910472", creatorId: "c2", creatorName: "minimal.arch",
    postType: "carousel", caption: "Concrete, light, and shadow. The new gallery wing by Tadao Ando \u2014 every surface tells a story. #architecture #minimalism #concrete",
    hashtags: ["architecture", "minimalism", "concrete"], mediaUrls: [],
    capturedAt: "2024-06-26T14:15:00Z",
    latestEngagement: makeEngagement(15200, 89000, 1200, 340, 5600, "2024-06-27T08:14:00Z"),
    engagementHistory: [
      makeEngagement(15200, 89000, 1200, 340, 5600, "2024-06-27T08:14:00Z"),
    ],
    revisions: [
      { id: "rv3", version: 1, caption: "Concrete, light, and shadow. The new gallery wing by Tadao Ando \u2014 every surface tells a story. #architecture #minimalism #concrete", hashtags: ["architecture", "minimalism", "concrete"], detectedAt: "2024-06-26T14:15:00Z" },
    ],
    analyses: [],
    extractionStatus: "ok",
  },
  {
    id: "p3", platform: "tiktok", platformPostId: "8192004731", creatorId: "c5", creatorName: "code.aesthetic",
    postType: "video", caption: "I rewrote this animation in 3 lines of CSS. Here\u2019s how. #css #webdev #frontend",
    hashtags: ["css", "webdev", "frontend"], mediaUrls: [],
    capturedAt: "2024-06-25T18:00:00Z",
    latestEngagement: makeEngagement(128000, 4500000, 8900, 3200, 5600, "2024-06-27T09:30:00Z"),
    engagementHistory: [
      makeEngagement(45000, 1200000, 2100, 890, 1800, "2024-06-25T18:00:00Z"),
      makeEngagement(78000, 2800000, 5400, 1800, 3400, "2024-06-26T10:00:00Z"),
      makeEngagement(128000, 4500000, 8900, 3200, 5600, "2024-06-27T09:30:00Z"),
    ],
    revisions: [
      { id: "rv4", version: 1, caption: "I rewrote this animation in 3 lines of CSS. Here\u2019s how. #css #webdev #frontend", hashtags: ["css", "webdev", "frontend"], detectedAt: "2024-06-25T18:00:00Z" },
    ],
    analyses: [
      { id: "a2", promptName: "Code Technique Tag", provider: "openai", model: "gpt-5", status: "ready", output: "Technique: CSS @keyframes with transform and opacity. Uses cubic-bezier(0.16, 1, 0.3, 1) easing. No JS required.", costEstimate: 0.05, completedAt: "2024-06-25T18:05:00Z" },
    ],
    extractionStatus: "ok",
  },
  {
    id: "p4", platform: "instagram", platformPostId: "4428910234", creatorId: "c4", creatorName: "film.grain.co",
    postType: "reel", caption: "Portra 400 in golden hour. The grain is the point. #filmphotography #analog #portra400",
    hashtags: ["filmphotography", "analog", "portra400"], mediaUrls: [],
    capturedAt: "2024-06-24T12:30:00Z",
    latestEngagement: makeEngagement(3400, 56000, 340, 89, 1200, "2024-06-27T08:14:00Z"),
    engagementHistory: [
      makeEngagement(3400, 56000, 340, 89, 1200, "2024-06-27T08:14:00Z"),
    ],
    revisions: [
      { id: "rv5", version: 1, caption: "Portra 400 in golden hour. The grain is the point. #filmphotography #analog #portra400", hashtags: ["filmphotography", "analog", "portra400"], detectedAt: "2024-06-24T12:30:00Z" },
    ],
    analyses: [],
    extractionStatus: "ok",
  },
  {
    id: "p5", platform: "tiktok", platformPostId: "9928471023", creatorId: "c3", creatorName: "tech_reviewz",
    postType: "video", caption: "This phone folds. But should it? Full teardown and thermal analysis. #tech #review #smartphone",
    hashtags: ["tech", "review", "smartphone"], mediaUrls: [],
    capturedAt: "2024-06-22T11:00:00Z",
    latestEngagement: makeEngagement(67000, 2100000, 4200, 1500, 3400, "2024-06-27T09:30:00Z"),
    engagementHistory: [
      makeEngagement(12000, 340000, 890, 320, 560, "2024-06-22T11:00:00Z"),
      makeEngagement(34000, 890000, 2100, 780, 1800, "2024-06-24T10:00:00Z"),
      makeEngagement(67000, 2100000, 4200, 1500, 3400, "2024-06-27T09:30:00Z"),
    ],
    revisions: [
      { id: "rv6", version: 1, caption: "This phone folds. But should it?", hashtags: ["tech"], detectedAt: "2024-06-22T11:00:00Z" },
      { id: "rv7", version: 2, caption: "This phone folds. But should it? Full teardown and thermal analysis. #tech #review #smartphone", hashtags: ["tech", "review", "smartphone"], detectedAt: "2024-06-24T10:00:00Z" },
    ],
    analyses: [
      { id: "a3", promptName: "Sentiment Overview", provider: "openrouter", model: "anthropic/claude-opus-4.5", status: "ready", output: "Audience sentiment: 62% positive on technical depth, 24% neutral on price concern, 14% negative on durability skepticism.", costEstimate: 0.08, completedAt: "2024-06-25T12:00:00Z" },
    ],
    extractionStatus: "ok",
  },
  {
    id: "p6", platform: "instagram", platformPostId: "5520193847", creatorId: "c2", creatorName: "minimal.arch",
    postType: "photo", caption: "Negative space as architecture. #minimalism #interior",
    hashtags: ["minimalism", "interior"], mediaUrls: [],
    capturedAt: "2024-06-20T09:00:00Z",
    latestEngagement: makeEngagement(8900, 34000, 560, 230, 3400, "2024-06-27T08:14:00Z"),
    engagementHistory: [
      makeEngagement(8900, 34000, 560, 230, 3400, "2024-06-27T08:14:00Z"),
    ],
    revisions: [
      { id: "rv8", version: 1, caption: "Negative space as architecture. #minimalism #interior", hashtags: ["minimalism", "interior"], detectedAt: "2024-06-20T09:00:00Z" },
    ],
    analyses: [],
    extractionStatus: "partial",
  },
];

export const prompts: Prompt[] = [
  { id: "pr1", name: "Brand Cues Extract", provider: "gemini", model: "gemini-3.1-pro-preview", promptText: "Extract all brand identifiers and visual cues from the following media. Output JSON with [timestamp, object_type, confidence_score, bounding_box].", appliesTo: "both", currentVersion: 4, versionCount: 4 },
  { id: "pr2", name: "Code Technique Tag", provider: "openai", model: "gpt-5", promptText: "Identify the coding technique used in this video. Summarize in 2 sentences max.", appliesTo: "video", currentVersion: 2, versionCount: 2 },
  { id: "pr3", name: "Sentiment Overview", provider: "openrouter", model: "anthropic/claude-opus-4.5", promptText: "Analyze the top comments sentiment for this post. Return percentages: positive, neutral, negative.", appliesTo: "both", currentVersion: 3, versionCount: 5 },
  { id: "pr4", name: "Color Palette Extract", provider: "gemini", model: "gemini-3.1-pro-preview", promptText: "Extract the dominant color palette from this image as hex values. Include primary, secondary, and accent.", appliesTo: "image", currentVersion: 1, versionCount: 1 },
];
