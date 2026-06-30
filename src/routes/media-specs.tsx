import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  getMediaSpecs,
  type MediaSpec,
  type Platform,
  type ContentFormat,
} from "../lib/mock-media-specs";
import { fmtNum } from "../lib/date";
import { UploadAnalysisView } from "../components/upload-analysis";
import {
  getUploadSubmissions,
  bitrateRetained,
  type UploadSubmission,
} from "../lib/mock-uploads";
import { scraperById } from "../lib/mock-scrapers";

export const Route = createFileRoute("/media-specs")({
  head: () => ({
    meta: [
      { title: "Media Specs, Vault" },
      { name: "description", content: "Technical metadata analytics for archived media" },
    ],
  }),
  component: MediaSpecsPage,
});

type PlatformFilter = "all" | Platform;
type KindFilter = "all" | "image" | "video";
type FormatFilter = "all" | ContentFormat;

const FORMATS_BY_PLATFORM: Record<PlatformFilter, ContentFormat[]> = {
  all: ["video", "reel", "slideshow", "photo", "carousel", "short", "long"],
  tiktok: ["video", "slideshow"],
  instagram: ["reel", "video", "photo", "carousel"],
  youtube: ["short", "long"],
};

const FORMAT_LABEL: Record<ContentFormat, string> = {
  video: "video",
  reel: "reel",
  slideshow: "slideshow",
  photo: "photo",
  carousel: "carousel",
  short: "short",
  long: "long",
};

function bucket<Row, T extends string | number>(
  rows: Row[],
  key: (s: Row) => T | null | undefined,
): Array<{ label: string; count: number }> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    if (k === null || k === undefined) continue;
    const s = String(k);
    m.set(s, (m.get(s) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

function bucketRange<Row>(
  rows: Row[],
  key: (s: Row) => number | null | undefined,
  ranges: Array<{ label: string; min: number; max: number }>,
): Array<{ label: string; count: number }> {
  const counts = ranges.map(() => 0);
  for (const r of rows) {
    const v = key(r);
    if (v === null || v === undefined) continue;
    for (let i = 0; i < ranges.length; i++) {
      if (v >= ranges[i].min && v < ranges[i].max) {
        counts[i]++;
        break;
      }
    }
  }
  return ranges.map((r, i) => ({ label: r.label, count: counts[i] }));
}

function Panel({
  title,
  subtitle,
  rows,
  total,
  mono = false,
}: {
  title: string;
  subtitle?: string;
  rows: Array<{ label: string; count: number }>;
  total: number;
  mono?: boolean;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="py-5">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground">
          n={fmtNum(total)}
        </span>
      </div>
      <div className="space-y-1">
        {rows.length === 0 && (
          <div className="text-xs text-muted-foreground py-2">No data</div>
        )}
        {rows.map((r) => {
          const pct = total ? (r.count / total) * 100 : 0;
          const barPct = (r.count / max) * 100;
          return (
            <div key={r.label} className="grid grid-cols-[140px_1fr_80px] items-center gap-3 group">
              <div className={"text-xs truncate " + (mono ? "" : "")}>
                {r.label}
              </div>
              <div
                className="h-0.5 bg-foreground/50"
                style={{ width: `${barPct}%` }}
              />
              <div className="text-[11px] text-muted-foreground text-right tabular-nums">
                {fmtNum(r.count)}
                <span className="text-muted-foreground ml-1.5">
                  {pct.toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STACK_SHADES = [
  "bg-foreground",
  "bg-foreground/70",
  "bg-foreground/50",
  "bg-foreground/35",
  "bg-foreground/25",
  "bg-foreground/15",
  "bg-foreground/10",
];

function StackedBar({
  title,
  subtitle,
  rows,
  total,
  maxSegments = 6,
}: {
  title: string;
  subtitle?: string;
  rows: Array<{ label: string; count: number }>;
  total: number;
  maxSegments?: number;
}) {
  // Collapse the long tail into a single "Other" segment so the bar stays readable.
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  const head = sorted.slice(0, maxSegments);
  const tail = sorted.slice(maxSegments);
  const segments =
    tail.length > 0
      ? [
          ...head,
          { label: "Other", count: tail.reduce((acc, r) => acc + r.count, 0) },
        ]
      : head;

  return (
    <div className="py-5">
      <div className="flex items-baseline justify-between mb-2.5">
        <div>
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        <span className="text-[11px] text-muted-foreground">n={fmtNum(total)}</span>
      </div>

      {segments.length === 0 ? (
        <div className="text-xs text-muted-foreground py-2">No data</div>
      ) : (
        <>
          <div className="flex h-6 w-full overflow-hidden rounded border border-border">
            {segments.map((s, i) => {
              const pct = total ? (s.count / total) * 100 : 0;
              return (
                <div
                  key={s.label}
                  className={
                    STACK_SHADES[i % STACK_SHADES.length] +
                    (i > 0 ? " border-l border-background" : "")
                  }
                  style={{ width: `${pct}%` }}
                  title={`${s.label} · ${pct.toFixed(1)}%`}
                />
              );
            })}
          </div>
          <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1">
            {segments.map((s, i) => {
              const pct = total ? (s.count / total) * 100 : 0;
              return (
                <div key={s.label} className="flex items-center gap-2 min-w-0">
                  <span
                    className={
                      "h-2.5 w-2.5 shrink-0 rounded-sm " +
                      STACK_SHADES[i % STACK_SHADES.length]
                    }
                  />
                  <span className="text-xs text-foreground truncate">{s.label}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground tabular-nums shrink-0">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-1">
        {label}
      </div>
      <div className="text-2xl text-foreground tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

type ChipOption = {
  key: string;
  label: string;
  active: boolean;
  count?: number;
  pct?: number;
  onClick: () => void;
};

function FilterRow({ label, options }: { label: string; options: ChipOption[] }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground mr-1">{label}</span>
      {options.map((o) => (
        <button
          key={o.key}
          onClick={o.onClick}
          className={
            "px-3 py-1.5 rounded-lg text-sm " +
            (o.active
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground ")
          }
        >
          {o.label}
          {o.count !== undefined && (
            <span className="ml-1.5 tabular-nums text-muted-foreground">{fmtNum(o.count)}</span>
          )}
          {o.pct !== undefined && (
            <span className="ml-1 text-muted-foreground">{o.pct.toFixed(1)}%</span>
          )}
        </button>
      ))}
    </div>
  );
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function MediaSpecsPage() {
  const all = useMemo(() => getMediaSpecs(), []);
  const subs = useMemo(() => getUploadSubmissions(), []);
  const [view, setView] = useState<"distributions" | "uploads">("distributions");
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [format, setFormat] = useState<FormatFilter>("all");

  // Reset format when platform change makes the current format invalid.
  const availableFormats = FORMATS_BY_PLATFORM[platform];
  const activeFormat: FormatFilter =
    format !== "all" && !availableFormats.includes(format) ? "all" : format;

  // Format implies kind: photo/carousel/slideshow → image, video/reel → video.
  const kind: KindFilter =
    activeFormat === "all"
      ? "all"
      : activeFormat === "photo" || activeFormat === "carousel" || activeFormat === "slideshow"
        ? "image"
        : "video";

  const rows = useMemo(() => {
    return all.filter((s) => {
      if (platform !== "all" && s.platform !== platform) return false;
      if (activeFormat !== "all" && s.contentFormat !== activeFormat) return false;
      return true;
    });
  }, [all, platform, activeFormat]);

  // Counts per format within the current platform scope (drives chip badges).
  const scopedForFormat = useMemo(() => {
    return all.filter((s) => (platform === "all" ? true : s.platform === platform));
  }, [all, platform]);

  const formatCounts = useMemo(() => {
    const m = new Map<ContentFormat, number>();
    for (const s of scopedForFormat) m.set(s.contentFormat, (m.get(s.contentFormat) ?? 0) + 1);
    return m;
  }, [scopedForFormat]);

  const images = rows.filter((r) => r.type === "image");
  const videos = rows.filter((r) => r.type === "video");

  const medianFileSize = useMemo(() => median(rows.map((r) => r.fileSize)), [rows]);
  const medianVideoBitrate = useMemo(
    () => median(videos.map((v) => (v as any).bitRateBps as number)),
    [videos],
  );
  const medianDuration = useMemo(
    () => median(videos.map((v) => (v as any).durationSec as number)),
    [videos],
  );

  const formatBytes = (n: number) => {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
    return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const scopeLabel =
    (platform === "all" ? "all platforms" : platform) +
    (activeFormat === "all" ? "" : ` · ${FORMAT_LABEL[activeFormat]}`);

  const scopedTotal = scopedForFormat.length;

  return (
    <div className="h-full overflow-y-auto">
      <header className="px-6 pt-6 pb-4">
        <div className="mb-4">
          <h1 className="text-lg font-medium flex items-center gap-2">
            Media Specs
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {view === "distributions"
              ? `Technical metadata distributions across ${fmtNum(all.length)} archived assets. Compare encoding parameters between platforms and content formats to inform delivery defaults.`
              : "Compare what creators uploaded against what the platform delivered and Vault scraped back, with device and network context for each TikTok post."}
          </p>
        </div>

        <div className="flex items-center gap-1 border-b border-border mb-4 -mt-1">
          {(
            [
              ["distributions", "Distributions"],
              ["uploads", "Upload analysis"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={
                "px-3 py-2 text-sm -mb-px border-b-2 " +
                (view === key
                  ? "border-foreground text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div
          className={
            "flex flex-wrap items-center gap-x-6 gap-y-2 text-xs " +
            (view === "uploads" ? "hidden" : "")
          }
        >
          <FilterRow
            label="PLATFORM"
            options={(["all", "tiktok", "instagram", "youtube"] as PlatformFilter[]).map((p) => ({
              key: p,
              label: p,
              active: platform === p,
              onClick: () => {
                setPlatform(p);
                setFormat("all");
              },
            }))}
          />
          <FilterRow
            label="FORMAT"
            options={[
              {
                key: "all",
                label: "all",
                active: activeFormat === "all",
                count: scopedTotal,
                onClick: () => setFormat("all"),
              },
              ...availableFormats.map((f) => {
                const count = formatCounts.get(f) ?? 0;
                const pct = scopedTotal ? (count / scopedTotal) * 100 : 0;
                return {
                  key: f,
                  label: FORMAT_LABEL[f],
                  active: activeFormat === f,
                  count,
                  pct,
                  onClick: () => setFormat(f),
                };
              }),
            ]}
          />
        </div>
      </header>

      {view === "uploads" && <UploadAnalysisView />}

      {view === "distributions" && (
      <>
      <div className="px-6 py-5 grid grid-cols-2 md:grid-cols-5 gap-6">
        <Stat label="Assets" value={fmtNum(rows.length)} sub={scopeLabel} />
        <Stat label="Images" value={fmtNum(images.length)} />
        <Stat label="Videos" value={fmtNum(videos.length)} />
        <Stat label="Median size" value={formatBytes(medianFileSize)} />
        <Stat
          label="Median bitrate"
          value={videos.length ? `${(medianVideoBitrate / 1_000_000).toFixed(1)} Mb/s` : ","}
          sub={videos.length ? `${medianDuration.toFixed(1)}s median dur.` : undefined}
        />
      </div>



      <div className="px-6 pb-12 grid grid-cols-1 lg:grid-cols-2 gap-x-10">
        {(kind === "all" || kind === "image") && (
          <section>
            <h2 className="mt-6 mb-1 text-xs text-foreground flex items-center gap-2">
               Image
            </h2>
            <Panel
              title="Container format"
              subtitle="from MIME type"
              total={images.length}
              rows={bucket(images, (s) => (s.type === "image" ? s.format : null))}
              mono
            />
            <Panel
              title="Aspect ratio"
              total={images.length}
              rows={bucket(images, (s) => (s.type === "image" ? s.aspectRatio : null))}
              mono
            />
            <Panel
              title="Resolution"
              subtitle="width × height"
              total={images.length}
              rows={bucket(images, (s) =>
                s.type === "image" ? `${s.width}×${s.height}` : null,
              )}
              mono
            />
            <Panel
              title="JPEG quality"
              subtitle="quantization estimate, JPEG only"
              total={images.filter((i) => i.type === "image" && i.jpegQuality != null).length}
              rows={bucket(images, (s) => (s.type === "image" ? s.jpegQuality : null))}
              mono
            />
            <Panel
              title="Chroma subsampling"
              subtitle="JPEG only"
              total={images.filter((i) => i.type === "image" && i.chromaSubsampling).length}
              rows={bucket(images, (s) => (s.type === "image" ? s.chromaSubsampling : null))}
              mono
            />
            <Panel
              title="File size"
              total={images.length}
              rows={bucketRange(
                images,
                (s) => s.fileSize,
                [
                  { label: "< 100 KB", min: 0, max: 100_000 },
                  { label: "100–250 KB", min: 100_000, max: 250_000 },
                  { label: "250–500 KB", min: 250_000, max: 500_000 },
                  { label: "500 KB – 1 MB", min: 500_000, max: 1_000_000 },
                  { label: "≥ 1 MB", min: 1_000_000, max: Infinity },
                ],
              )}
              mono
            />
          </section>
        )}

        {(kind === "all" || kind === "video") && (
          <section>
            <h2 className="mt-6 mb-1 text-xs text-foreground flex items-center gap-2">
               Video
            </h2>
            <Panel
              title="Video codec"
              total={videos.length}
              rows={bucket(videos, (s) => (s.type === "video" ? s.videoCodec : null))}
              mono
            />
            <Panel
              title="Container format"
              subtitle="ffprobe format_name"
              total={videos.length}
              rows={bucket(videos, (s) => (s.type === "video" ? s.format : null))}
              mono
            />
            <Panel
              title="Resolution"
              total={videos.length}
              rows={bucket(videos, (s) =>
                s.type === "video" ? `${s.width}×${s.height}` : null,
              )}
              mono
            />
            <Panel
              title="Aspect ratio"
              total={videos.length}
              rows={bucket(videos, (s) => (s.type === "video" ? s.aspectRatio : null))}
              mono
            />
            <Panel
              title="Frame rate"
              subtitle="avg_frame_rate (fps)"
              total={videos.length}
              rows={bucket(videos, (s) =>
                s.type === "video" ? s.frameRate.toString() : null,
              )}
              mono
            />
            <Panel
              title="Pixel format"
              total={videos.length}
              rows={bucket(videos, (s) => (s.type === "video" ? s.pixFmt : null))}
              mono
            />
            <Panel
              title="Bit depth"
              total={videos.length}
              rows={bucket(videos, (s) =>
                s.type === "video" ? `${s.bitDepth}-bit` : null,
              )}
              mono
            />
            <Panel
              title="Video bitrate"
              total={videos.length}
              rows={bucketRange(
                videos,
                (s) => (s.type === "video" ? s.bitRateBps : null),
                [
                  { label: "< 2 Mb/s", min: 0, max: 2_000_000 },
                  { label: "2–4 Mb/s", min: 2_000_000, max: 4_000_000 },
                  { label: "4–6 Mb/s", min: 4_000_000, max: 6_000_000 },
                  { label: "6–10 Mb/s", min: 6_000_000, max: 10_000_000 },
                  { label: "≥ 10 Mb/s", min: 10_000_000, max: Infinity },
                ],
              )}
              mono
            />
            <Panel
              title="Duration"
              total={videos.length}
              rows={bucketRange(
                videos,
                (s) => (s.type === "video" ? s.durationSec : null),
                [
                  { label: "< 10 s", min: 0, max: 10 },
                  { label: "10–30 s", min: 10, max: 30 },
                  { label: "30–60 s", min: 30, max: 60 },
                  { label: "1–3 min", min: 60, max: 180 },
                  { label: "≥ 3 min", min: 180, max: Infinity },
                ],
              )}
              mono
            />
            <Panel
              title="Audio codec"
              total={videos.filter((v) => v.type === "video" && v.audioCodec).length}
              rows={bucket(videos, (s) => (s.type === "video" ? s.audioCodec : null))}
              mono
            />
            <Panel
              title="Audio sample rate"
              total={videos.filter((v) => v.type === "video" && v.sampleRateHz).length}
              rows={bucket(videos, (s) =>
                s.type === "video" && s.sampleRateHz ? `${s.sampleRateHz / 1000} kHz` : null,
              )}
              mono
            />
            <Panel
              title="Integrated loudness"
              subtitle="LUFS, ebur128"
              total={videos.filter((v) => v.type === "video" && v.loudnessLufs != null).length}
              rows={bucketRange(
                videos,
                (s) => (s.type === "video" ? s.loudnessLufs : null),
                [
                  { label: "≤ -20 LUFS", min: -Infinity, max: -20 },
                  { label: "-20 to -16", min: -20, max: -16 },
                  { label: "-16 to -14", min: -16, max: -14 },
                  { label: "-14 to -10", min: -14, max: -10 },
                  { label: "> -10 LUFS", min: -10, max: Infinity },
                ],
              )}
              mono
            />
          </section>
        )}

        {(platform === "all" || platform === "tiktok") &&
          (kind === "all" || kind === "video") && (
            <section className="lg:col-span-2">
              <h2 className="mt-6 mb-1 text-xs text-foreground flex items-center gap-2">
                Upload submissions
              </h2>
              <p className="text-[11px] text-muted-foreground mb-1">
                Self-reported capture context and original specs submitted via the ingest API,
                across {fmtNum(subs.length)} TikTok video posts. Compare against the scraped
                delivery distributions above to see platform transcoding behavior.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10">
                <div>
                  <StackedBar
                    title="Capture device"
                    subtitle="device.model"
                    total={subs.length}
                    rows={bucket<UploadSubmission, string>(subs, (s) => s.device.model)}
                  />
                  <StackedBar
                    title="Operating system"
                    total={subs.length}
                    rows={bucket<UploadSubmission, string>(subs, (s) => s.device.os)}
                  />
                  <StackedBar
                    title="Network connection"
                    subtitle="at upload time"
                    total={subs.length}
                    rows={bucket<UploadSubmission, string>(subs, (s) => s.network.connection)}
                  />
                  <StackedBar
                    title="Uplink speed"
                    subtitle="measured at submit"
                    total={subs.length}
                    rows={bucketRange<UploadSubmission>(subs, (s) => s.network.upMbps, [
                      { label: "< 5 Mb/s", min: 0, max: 5 },
                      { label: "5–15 Mb/s", min: 5, max: 15 },
                      { label: "15–30 Mb/s", min: 15, max: 30 },
                      { label: "30–60 Mb/s", min: 30, max: 60 },
                      { label: "≥ 60 Mb/s", min: 60, max: Infinity },
                    ])}
                  />
                  <StackedBar
                    title="Capture dynamic range"
                    subtitle="original.hdr"
                    total={subs.length}
                    rows={bucket<UploadSubmission, string>(subs, (s) => s.original.hdr)}
                  />
                  <StackedBar
                    title="Scraper used"
                    subtitle="retrieved the delivery"
                    total={subs.length}
                    rows={bucket<UploadSubmission, string>(
                      subs,
                      (s) => scraperById[s.scraperId]?.name ?? s.scraperId,
                    )}
                  />
                </div>
                <div>
                  <StackedBar
                    title="Original codec"
                    subtitle="as uploaded"
                    total={subs.length}
                    rows={bucket<UploadSubmission, string>(subs, (s) =>
                      s.original.videoCodec.toUpperCase(),
                    )}
                  />
                  <StackedBar
                    title="Original resolution"
                    subtitle="capture width × height"
                    total={subs.length}
                    rows={bucket<UploadSubmission, string>(
                      subs,
                      (s) => `${s.original.width}×${s.original.height}`,
                    )}
                  />
                  <StackedBar
                    title="Original frame rate"
                    total={subs.length}
                    rows={bucket<UploadSubmission, string>(
                      subs,
                      (s) => `${s.original.frameRate} fps`,
                    )}
                  />
                  <StackedBar
                    title="Platform transcode verdict"
                    subtitle="upload → delivery"
                    total={subs.length}
                    rows={bucket<UploadSubmission, string>(subs, (s) => s.verdict)}
                  />
                  <StackedBar
                    title="Bitrate retained"
                    subtitle="delivered ÷ original"
                    total={subs.length}
                    rows={bucketRange<UploadSubmission>(
                      subs,
                      (s) => bitrateRetained(s) * 100,
                      [
                        { label: "< 10%", min: 0, max: 10 },
                        { label: "10–20%", min: 10, max: 20 },
                        { label: "20–35%", min: 20, max: 35 },
                        { label: "35–60%", min: 35, max: 60 },
                        { label: "≥ 60%", min: 60, max: Infinity },
                      ],
                    )}
                  />
                  <StackedBar
                    title="Data sharing"
                    subtitle="operator opt-in"
                    total={subs.length}
                    rows={bucket<UploadSubmission, string>(subs, (s) =>
                      s.shared ? "Shared with maintainer" : "Private / self-hosted",
                    )}
                  />
                </div>
              </div>
            </section>
          )}
      </div>
      </>
      )}
    </div>
  );
}
