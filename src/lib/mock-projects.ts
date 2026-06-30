import { allCreators, archivePosts } from "./mock-archive";

export type ProjectMode = "auto" | "manual";

export type Project = {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description: string;
  mode: ProjectMode;
  createdAt: string;
  updatedAt: string;
  owner: string;
  color: string;
  creatorIds: string[];
  postIds: string[];
  scrapeIntervalMinutes?: number;
  lastRunAt?: string;
  status: "active" | "paused" | "archived";
  tags: string[];
};

const palette = ["#111111", "#2563eb", "#059669", "#b45309", "#7c3aed", "#be123c", "#0f766e"];

function pickCreators(n: number, offset: number) {
  return allCreators.slice(offset, offset + n).map((c) => c.id);
}
function pickPosts(n: number, offset: number) {
  return archivePosts.slice(offset, offset + n).map((p) => p.id);
}

export const projects: Project[] = [
  // Silvekoski (org_main)
  {
    id: "p-coffee",
    orgId: "org_main",
    name: "Coffee",
    slug: "coffee",
    description: "Tracks specialty coffee creators, roasters, and brew technique videos.",
    mode: "auto",
    createdAt: "2026-01-12T09:00:00Z",
    updatedAt: "2026-06-26T11:24:00Z",
    owner: "ada@silvekoski.io",
    color: palette[3]!,
    creatorIds: pickCreators(10, 0),
    postIds: [],
    scrapeIntervalMinutes: 120,
    lastRunAt: "2026-06-27T05:12:00Z",
    status: "active",
    tags: ["coffee", "brewing"],
  },
  {
    id: "p-coding",
    orgId: "org_main",
    name: "Coding",
    slug: "coding",
    description: "Dev creators, IDE tips, language deep-dives. Auto-pulls every new post.",
    mode: "auto",
    createdAt: "2026-02-04T14:30:00Z",
    updatedAt: "2026-06-27T03:02:00Z",
    owner: "ren@silvekoski.io",
    color: palette[1]!,
    creatorIds: pickCreators(12, 10),
    postIds: [],
    scrapeIntervalMinutes: 30,
    lastRunAt: "2026-06-27T05:45:00Z",
    status: "active",
    tags: ["dev", "tooling"],
  },
  {
    id: "p-linux",
    orgId: "org_main",
    name: "Linux",
    slug: "linux",
    description: "Curated highlights from the Linux + open-source community.",
    mode: "manual",
    createdAt: "2026-03-22T10:00:00Z",
    updatedAt: "2026-06-25T16:11:00Z",
    owner: "mira@silvekoski.io",
    color: palette[0]!,
    creatorIds: [],
    postIds: pickPosts(36, 60),
    status: "active",
    tags: ["linux", "foss"],
  },

  // lnx (org_studio)
  {
    id: "p-finance",
    orgId: "org_studio",
    name: "Finance",
    slug: "finance",
    description: "Personal finance, markets, and macro creators.",
    mode: "auto",
    createdAt: "2026-02-18T12:00:00Z",
    updatedAt: "2026-06-26T10:00:00Z",
    owner: "jamie@lnx.co",
    color: palette[2]!,
    creatorIds: pickCreators(8, 22),
    postIds: [],
    scrapeIntervalMinutes: 60,
    lastRunAt: "2026-06-27T04:00:00Z",
    status: "active",
    tags: ["finance", "markets"],
  },
  {
    id: "p-startup",
    orgId: "org_studio",
    name: "Startup",
    slug: "startup",
    description: "Founder stories, fundraising, and product launches.",
    mode: "auto",
    createdAt: "2026-03-01T08:15:00Z",
    updatedAt: "2026-06-20T09:00:00Z",
    owner: "dana@lnx.co",
    color: palette[5]!,
    creatorIds: pickCreators(6, 30),
    postIds: [],
    scrapeIntervalMinutes: 240,
    lastRunAt: "2026-06-27T02:18:00Z",
    status: "active",
    tags: ["startup", "founders"],
  },
  {
    id: "p-skiing",
    orgId: "org_studio",
    name: "Skiing",
    slug: "skiing",
    description: "Off-season moodboard, hand-picked skiing and backcountry clips.",
    mode: "manual",
    createdAt: "2026-04-10T07:00:00Z",
    updatedAt: "2026-06-22T02:18:00Z",
    owner: "oren@lnx.co",
    color: palette[6]!,
    creatorIds: [],
    postIds: pickPosts(18, 130),
    status: "paused",
    tags: ["skiing", "moodboard"],
  },

  // Movaroo (org_research)
  {
    id: "p-moving-videos-fi",
    orgId: "org_research",
    name: "Moving videos fi",
    slug: "moving-videos-fi",
    description: "All Finnish moving-company creators, watched continuously for new posts.",
    mode: "auto",
    createdAt: "2026-05-10T07:00:00Z",
    updatedAt: "2026-06-27T02:18:00Z",
    owner: "kenji@movaroo.io",
    color: palette[4]!,
    creatorIds: pickCreators(22, 22),
    postIds: [],
    scrapeIntervalMinutes: 180,
    lastRunAt: "2026-06-27T04:00:00Z",
    status: "active",
    tags: ["finland", "moving"],
  },
];

export const projectById = new Map(projects.map((p) => [p.id, p] as const));
