import { useEffect, useMemo, useState } from "react";
import {
  getUploadSubmissions,
  compareRows,
  bitrateRetained,
  fmtUploadBytes,
  type UploadSubmission,
} from "../lib/mock-uploads";
import { scraperById } from "../lib/mock-scrapers";
import { fmtDate, fmtNum } from "../lib/date";

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
      <div className="text-2xl text-foreground tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: UploadSubmission["verdict"] }) {
  const label =
    verdict === "downscaled"
      ? "Downscaled"
      : verdict === "near-lossless"
        ? "Near-lossless"
        : "Recompressed";
  return (
    <span className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
      {label}
    </span>
  );
}

export function UploadAnalysisView() {
  const subs = useMemo(() => getUploadSubmissions(), []);
  const [selected, setSelected] = useState<UploadSubmission | null>(null);
  const [limit, setLimit] = useState(50);
  const visible = subs.slice(0, limit);

  const stats = useMemo(() => {
    const shared = subs.filter((s) => s.shared).length;
    const downscaled = subs.filter((s) => s.verdict === "downscaled").length;
    const medRet = median(subs.map((s) => bitrateRetained(s) * 100));
    const medUp = median(subs.map((s) => s.network.upMbps));
    return {
      count: subs.length,
      sharedPct: subs.length ? (shared / subs.length) * 100 : 0,
      downscaledPct: subs.length ? (downscaled / subs.length) * 100 : 0,
      medRet,
      medUp,
    };
  }, [subs]);

  return (
    <div className="px-6 pb-12">
      {/* opt-in / self-hosted note */}
      <div className="rounded border border-border px-4 py-3 mb-6 text-xs text-muted-foreground">
        Submissions are recorded on your self-hosted instance. Rows marked{" "}
        <span className="text-foreground">Shared</span> were opted in by the operator to be sent to the
        maintainer for aggregate codec research. Nothing leaves your instance unless opted in.
      </div>

      {/* summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-2">
        <Stat label="Submissions" value={fmtNum(stats.count)} sub="TikTok posts" />
        <Stat label="Shared (opt-in)" value={`${stats.sharedPct.toFixed(0)}%`} />
        <Stat
          label="Median bitrate kept"
          value={`${stats.medRet.toFixed(0)}%`}
          sub="delivered ÷ uploaded"
        />
        <Stat label="Downscaled" value={`${stats.downscaledPct.toFixed(0)}%`} sub="resolution reduced" />
        <Stat label="Median uplink" value={`${stats.medUp.toFixed(0)} Mb/s`} sub="at upload time" />
      </div>

      <ApiContract />

      {/* submissions table */}
      <h2 className="mt-8 mb-2 text-xs text-foreground">Submissions</h2>
      <p className="text-[11px] text-muted-foreground mb-3">
        Select a row to compare the uploaded original against the scraped delivery.
      </p>
      <div className="border border-border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-border bg-muted/40">
              <th className="px-4 py-2 font-medium text-muted-foreground">Post ID</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Creator</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Device</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Network</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Scraper</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Bitrate kept</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Result</th>
              <th className="px-4 py-2 font-medium text-muted-foreground sr-only">Shared</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => {
              const sc = scraperById[s.scraperId];
              const ret = Math.round(bitrateRetained(s) * 100);
              return (
                <tr
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className="group border-b border-border last:border-0 cursor-pointer hover:bg-accent/50"
                >
                  <td className="px-4 py-2 font-mono text-xs text-foreground">{s.platformPostId}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{s.creatorName}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{s.device.model}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {s.network.connection} · {s.network.upMbps.toFixed(0)}↑
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{sc?.vendor ?? s.scraperId}</td>
                  <td className="px-4 py-2 text-xs tabular-nums text-foreground">{ret}%</td>
                  <td className="px-4 py-2">
                    <VerdictBadge verdict={s.verdict} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="text-[11px] text-muted-foreground">
                      {s.shared ? "Shared" : "Private"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[11px] text-muted-foreground">
          Showing {fmtNum(visible.length)} of {fmtNum(subs.length)} submissions
        </span>
        {limit < subs.length && (
          <button
            onClick={() => setLimit((n) => n + 50)}
            className="text-[11px] underline text-muted-foreground hover:text-foreground"
          >
            Show more
          </button>
        )}
      </div>

      {selected && (
        <CompareDrawer submission={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function ApiContract() {
  const [tab, setTab] = useState<"schema" | "curl" | "response">("schema");

  const schema = `POST /api/v1/uploads
Authorization: Bearer <instance_token>
Content-Type: application/json

{
  "postId": "7361029384756102345",        // TikTok post ID
  "device": {
    "model": "iPhone 15 Pro Max",
    "os": "iOS 17.4.1",
    "appVersion": "34.5.0",
    "capturedHdr": true
  },
  "network": {                              // measured at upload time
    "connection": "Wi-Fi",                  // Wi-Fi | 5G | 4G LTE | Ethernet
    "upMbps": 42.0,
    "downMbps": 220,
    "latencyMs": 18
  },
  "media": {                                // specs of the ORIGINAL file
    "container": "mp4",
    "videoCodec": "hevc",
    "width": 2160,
    "height": 3840,
    "bitRateBps": 48000000,
    "frameRate": 60,
    "durationSec": 14.2,
    "bitDepth": 10,
    "hdr": "Dolby Vision",
    "audioCodec": "aac",
    "audioBitRateBps": 256000,
    "sampleRateHz": 48000
  },
  "share": true                             // opt in to share with maintainer
}`;

  const curl = `curl -X POST https://vault.local/api/v1/uploads \\
  -H "Authorization: Bearer $VAULT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "postId": "7361029384756102345",
    "device": { "model": "iPhone 15 Pro Max", "os": "iOS 17.4.1", "appVersion": "34.5.0", "capturedHdr": true },
    "network": { "connection": "Wi-Fi", "upMbps": 42.0, "downMbps": 220, "latencyMs": 18 },
    "media": {
      "container": "mp4", "videoCodec": "hevc", "width": 2160, "height": 3840,
      "bitRateBps": 48000000, "frameRate": 60, "durationSec": 14.2,
      "bitDepth": 10, "hdr": "Dolby Vision", "audioCodec": "aac", "audioBitRateBps": 256000
    },
    "share": true
  }'`;

  const response = `201 Created

{
  "id": "up_g142",
  "postId": "7361029384756102345",
  "status": "matched",                      // matched | awaiting_scrape | not_found
  "scrapedBy": "apify-follower",            // scraper that fetched the delivery
  "verdict": "downscaled",                  // downscaled | recompressed | near-lossless
  "comparison": {
    "resolutionRetainedPct": 25,            // 2160x3840 -> 1080x1920
    "bitrateRetainedPct": 9,                // 48 Mb/s -> 4.3 Mb/s
    "fileSizeRetainedPct": 9,
    "dynamicRange": "Dolby Vision -> SDR",
    "videoCodec": "hevc -> h264"
  }
}`;

  const body =
    tab === "schema" ? schema : tab === "curl" ? curl : response;

  return (
    <div className="mt-6 border border-border rounded overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/40">
        <div className="text-xs text-foreground">
          Ingest API <span className="text-muted-foreground">— submit a TikTok post with its upload context</span>
        </div>
        <div className="flex items-center gap-1">
          {(["schema", "curl", "response"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "px-2 py-1 rounded text-[11px] capitalize " +
                (tab === t
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {t === "curl" ? "cURL" : t}
            </button>
          ))}
        </div>
      </div>
      <pre className="px-4 py-3 text-[11px] leading-relaxed text-foreground overflow-x-auto font-mono whitespace-pre">
        {body}
      </pre>
    </div>
  );
}

function CompareDrawer({
  submission,
  onClose,
}: {
  submission: UploadSubmission;
  onClose: () => void;
}) {
  const sc = scraperById[submission.scraperId];
  const rows = useMemo(() => compareRows(submission), [submission]);
  const o = submission.original;
  const net = submission.network;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-foreground/20" onClick={onClose} aria-hidden />
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-background border-l border-border overflow-y-auto">
        {/* header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border sticky top-0 bg-background">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground/70">
              TikTok upload · scraped delivery
            </p>
            <h2 className="text-lg font-semibold text-foreground font-mono truncate">
              {submission.platformPostId}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {submission.creatorName} · submitted {fmtDate(submission.submittedAt)}
              {submission.shared ? " · shared" : " · private"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded border border-border px-2 py-1 text-sm text-muted-foreground hover:text-foreground"
          >
            Esc
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* two-sided context headers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded border border-border p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Uploaded · original
              </div>
              <dl className="space-y-1.5 text-xs">
                <CtxRow k="Device" v={submission.device.model} />
                <CtxRow k="OS" v={`${submission.device.os} ${submission.device.osVersion}`} />
                <CtxRow k="App" v={`TikTok ${submission.device.appVersion}`} />
                <CtxRow k="Connection" v={net.connection} />
                <CtxRow k="Uplink" v={`${net.upMbps.toFixed(1)} Mb/s`} />
                <CtxRow k="Latency" v={`${net.latencyMs} ms`} />
                <CtxRow k="Est. upload" v={`${net.uploadSec.toFixed(1)} s`} />
              </dl>
            </div>
            <div className="rounded border border-border p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Scraped · delivery
              </div>
              <dl className="space-y-1.5 text-xs">
                <CtxRow k="Scraper" v={sc?.name ?? submission.scraperId} />
                <CtxRow k="Vendor" v={sc?.vendor ?? "—"} />
                <CtxRow k="Fetched" v={fmtDate(submission.scrapedAt)} />
                <CtxRow k="Auth" v={sc?.authMode ?? "—"} />
                <CtxRow k="Success rate" v={sc ? `${(sc.successRate * 100).toFixed(1)}%` : "—"} />
                <CtxRow k="Result" v={submission.verdict} />
                <CtxRow k="Origin file" v={fmtUploadBytes(o.fileSize)} />
              </dl>
            </div>
          </div>

          {/* comparison table */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Media comparison</h3>
            <div className="border border-border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-border bg-muted/40 text-[11px]">
                    <th className="px-3 py-2 font-medium text-muted-foreground">Field</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Uploaded</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground">Delivered</th>
                    <th className="px-3 py-2 font-medium text-muted-foreground text-right">Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.label} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-xs text-muted-foreground">{r.label}</td>
                      <td className="px-3 py-2 text-xs font-mono text-foreground">{r.original}</td>
                      <td
                        className={
                          "px-3 py-2 text-xs font-mono " +
                          (r.changed ? "text-foreground" : "text-muted-foreground")
                        }
                      >
                        {r.delivered}
                      </td>
                      <td className="px-3 py-2 text-[11px] text-right text-muted-foreground tabular-nums">
                        {r.delta ?? (r.changed ? "changed" : "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* submitted payload */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Submitted payload</h3>
            <pre className="border border-border rounded px-3 py-3 text-[11px] leading-relaxed font-mono text-foreground overflow-x-auto whitespace-pre">
{JSON.stringify(
  {
    postId: submission.platformPostId,
    device: {
      model: submission.device.model,
      os: `${submission.device.os} ${submission.device.osVersion}`,
      appVersion: submission.device.appVersion,
      capturedHdr: submission.device.capturedHdr,
    },
    network: {
      connection: net.connection,
      upMbps: net.upMbps,
      downMbps: net.downMbps,
      latencyMs: net.latencyMs,
    },
    media: {
      container: "mp4",
      videoCodec: o.videoCodec,
      width: o.width,
      height: o.height,
      bitRateBps: o.bitRateBps,
      frameRate: o.frameRate,
      durationSec: o.durationSec,
      bitDepth: o.bitDepth,
      hdr: o.hdr,
      audioCodec: o.audioCodec,
      audioBitRateBps: o.audioBitRateBps,
    },
    share: submission.shared,
  },
  null,
  2,
)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function CtxRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-foreground text-right truncate">{v}</dd>
    </div>
  );
}
