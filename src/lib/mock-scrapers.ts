export type ScraperPlatform = "tiktok" | "instagram" | "youtube";
export type ScraperOperation = "discovery" | "profile" | "post" | "engagement" | "followers" | "hashtag";

export interface Scraper {
  id: string;
  name: string;
  vendor: string;
  homepage: string;
  enabled: boolean;
  isDefault?: boolean;
  platforms: ScraperPlatform[];
  operations: ScraperOperation[];
  /** USD per 1000 items */
  pricePer1k: number;
  /** rough p50 latency seconds per item */
  latencySec: number;
  /** observed success rate 0..1 */
  successRate: number;
  /** monthly quota items, null = unlimited */
  monthlyQuota: number | null;
  usedThisMonth: number;
  status: "online" | "degraded" | "down" | "disabled";
  authMode: "api_key" | "oauth" | "session_cookie";
  notes?: string;
}

export const scrapers: Scraper[] = [
  {
    id: "apify-follower",
    name: "Follower Scraper",
    vendor: "Apify",
    homepage: "https://apify.com/store/follower-scraper/scrape-instagram-followers",
    enabled: true,
    isDefault: true,
    platforms: ["instagram", "tiktok"],
    operations: ["discovery", "profile", "post", "engagement", "followers", "hashtag"],
    pricePer1k: 2.30,
    latencySec: 0.6,
    successRate: 0.982,
    monthlyQuota: 500000,
    usedThisMonth: 184320,
    status: "online",
    authMode: "api_key",
    notes: "Primary general-purpose actor. Best coverage, residential proxies.",
  },
  {
    id: "brightdata-ig",
    name: "Web Scraper IG",
    vendor: "Bright Data",
    homepage: "https://brightdata.com/products/web-scraper/instagram",
    enabled: true,
    platforms: ["instagram"],
    operations: ["profile", "post", "engagement", "hashtag"],
    pricePer1k: 4.50,
    latencySec: 0.4,
    successRate: 0.991,
    monthlyQuota: null,
    usedThisMonth: 42100,
    status: "online",
    authMode: "api_key",
    notes: "Highest reliability for IG carousels and reels. Higher unit cost.",
  },
  {
    id: "floxy-ig",
    name: "Instagram Scraper",
    vendor: "Floxy",
    homepage: "https://www.floxy.io/scrapers/instagram",
    enabled: true,
    platforms: ["instagram"],
    operations: ["profile", "post", "hashtag"],
    pricePer1k: 1.20,
    latencySec: 1.1,
    successRate: 0.943,
    monthlyQuota: 100000,
    usedThisMonth: 78400,
    status: "degraded",
    authMode: "api_key",
    notes: "Cheapest IG option. Falls back when Apify quota is exhausted.",
  },
  {
    id: "tiktok-internal",
    name: "TikTok Web",
    vendor: "Internal",
    homepage: "",
    enabled: true,
    platforms: ["tiktok"],
    operations: ["discovery", "profile", "post", "engagement"],
    pricePer1k: 0.0,
    latencySec: 1.8,
    successRate: 0.871,
    monthlyQuota: null,
    usedThisMonth: 213440,
    status: "online",
    authMode: "session_cookie",
    notes: "Direct web scraping. Free but rate-limited; rotates session cookies.",
  },
  {
    id: "apidojo-tiktok",
    name: "TikTok Scraper",
    vendor: "ApiDojo",
    homepage: "https://apify.com/clockworks/tiktok-scraper",
    enabled: false,
    platforms: ["tiktok"],
    operations: ["profile", "post", "engagement", "hashtag"],
    pricePer1k: 3.00,
    latencySec: 0.5,
    successRate: 0.978,
    monthlyQuota: 250000,
    usedThisMonth: 0,
    status: "disabled",
    authMode: "api_key",
    notes: "Standby for TikTok fallback. Not currently routing traffic.",
  },
  {
    id: "youtube-data-api",
    name: "YouTube Data API",
    vendor: "Google",
    homepage: "https://developers.google.com/youtube/v3",
    enabled: true,
    isDefault: true,
    platforms: ["youtube"],
    operations: ["profile", "post", "engagement", "hashtag"],
    pricePer1k: 0.0,
    latencySec: 0.3,
    successRate: 0.997,
    monthlyQuota: 1000000,
    usedThisMonth: 312840,
    status: "online",
    authMode: "api_key",
    notes: "Official Data API v3. Quota measured in units, free tier 10k/day.",
  },
  {
    id: "apify-youtube",
    name: "YouTube Scraper",
    vendor: "Apify",
    homepage: "https://apify.com/streamers/youtube-scraper",
    enabled: true,
    platforms: ["youtube"],
    operations: ["discovery", "profile", "post", "engagement", "hashtag"],
    pricePer1k: 3.20,
    latencySec: 0.9,
    successRate: 0.961,
    monthlyQuota: 200000,
    usedThisMonth: 41200,
    status: "online",
    authMode: "api_key",
    notes: "Backfills shorts, comments and watch-page metadata Data API omits.",
  },
];

export const scraperById = Object.fromEntries(scrapers.map((s) => [s.id, s]));

/** Default routing: which scraper handles which (platform, operation). */
export const routingTable: Array<{
  platform: ScraperPlatform;
  operation: ScraperOperation;
  primary: string;
  fallback?: string;
}> = [
  { platform: "instagram", operation: "discovery", primary: "apify-follower", fallback: "floxy-ig" },
  { platform: "instagram", operation: "post", primary: "brightdata-ig", fallback: "apify-follower" },
  { platform: "instagram", operation: "engagement", primary: "apify-follower", fallback: "brightdata-ig" },
  { platform: "instagram", operation: "followers", primary: "apify-follower" },
  { platform: "instagram", operation: "hashtag", primary: "floxy-ig", fallback: "brightdata-ig" },
  { platform: "tiktok", operation: "discovery", primary: "tiktok-internal", fallback: "apify-follower" },
  { platform: "tiktok", operation: "post", primary: "apify-follower", fallback: "tiktok-internal" },
  { platform: "tiktok", operation: "engagement", primary: "tiktok-internal", fallback: "apify-follower" },
  { platform: "tiktok", operation: "hashtag", primary: "apify-follower" },
  { platform: "youtube", operation: "discovery", primary: "apify-youtube", fallback: "youtube-data-api" },
  { platform: "youtube", operation: "post", primary: "youtube-data-api", fallback: "apify-youtube" },
  { platform: "youtube", operation: "engagement", primary: "youtube-data-api", fallback: "apify-youtube" },
  { platform: "youtube", operation: "hashtag", primary: "apify-youtube" },
];
