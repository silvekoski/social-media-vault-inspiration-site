import { createFileRoute } from "@tanstack/react-router";
import { useLayoutEffect, useRef, useState } from "react";
import {
  scraperById,
  type Scraper,
  type ScraperPlatform,
} from "../lib/mock-scrapers";
import { useScopedScrapers, useScopedRouting } from "../lib/org-scope";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/scrapers")({
  head: () => ({
    meta: [
      { title: "Scrapers , Vault" },
      { name: "description", content: "Manage scraper providers and routing" },
    ],
  }),
  component: ScrapersPage,
});

function ScrapersPage() {
  const scrapers = useScopedScrapers();
  const enabled = scrapers.filter((s) => s.enabled).length;
  const totalSpend = scrapers.reduce((a, s) => a + (s.usedThisMonth / 1000) * s.pricePer1k, 0);
  const totalItems = scrapers.reduce((a, s) => a + s.usedThisMonth, 0);

  return (
    <section className="py-10">
      <div className="max-w-6xl mx-auto px-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Scrapers</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Provider-agnostic routing. Add, disable, or re-prioritise scraper backends per
              platform &amp; operation.
            </p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90">
            Add Scraper
          </button>
        </div>

        <div className="grid grid-cols-4 gap-8 mb-12">
          <Stat label="Registered" value={scrapers.length.toString()} />
          <Stat label="Enabled" value={enabled.toString()} />
          <Stat label="Items / month" value={fmt(totalItems)} />
          <Stat label="Spend / month" value={`$${totalSpend.toFixed(2)}`} primary />
        </div>

        <h2 className="text-sm font-medium text-foreground mb-3">
          Providers
        </h2>
        <table className="w-full text-left text-sm mb-12 table-fixed">
          <colgroup>
            <col className="w-[24%]" />
            <col className="w-[10%]" />
            <col className="w-[26%]" />
            <col className="w-[7%]" />
            <col className="w-[8%]" />
            <col className="w-[14%]" />
            <col className="w-[7%]" />
            <col className="w-[4%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-black/5 text-[10px] text-muted-foreground">
              <th className="px-3 py-2 font-medium">Provider</th>
              <th className="px-3 py-2 font-medium">Platforms</th>
              <th className="px-3 py-2 font-medium">Operations</th>
              <th className="px-3 py-2 font-medium text-right">$/1k</th>
              <th className="px-3 py-2 font-medium text-right">Success</th>
              <th className="px-3 py-2 font-medium">Quota</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium text-right">On</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {scrapers.map((s) => (
              <tr key={s.id} className="align-middle">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="text-foreground">{s.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      · {s.vendor}
                    </span>
                    {s.homepage && (
                      <a
                        href={s.homepage}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground"
                      >
                        <span className="text-[10px]">Web</span>
                      </a>
                    )}
                    {s.isDefault && (
                      <span className="text-[9px] text-foreground">
                        default
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {s.authMode}
                  </div>
                </td>
                <td className="px-3 py-3 text-[10px] text-muted-foreground">
                  {s.platforms.join(" · ")}
                </td>
                <td className="px-3 py-3 text-[11px] text-muted-foreground leading-relaxed">
                  {s.operations.join(", ")}
                </td>
                <td className="px-3 py-3 text-right text-xs tabular-nums">
                  ${s.pricePer1k.toFixed(2)}
                </td>
                <td className="px-3 py-3 text-right text-xs tabular-nums">
                  {(s.successRate * 100).toFixed(1)}%
                </td>
                <td className="px-3 py-3">
                  <QuotaBar scraper={s} />
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={s.status} />
                </td>
                <td className="px-3 py-3 text-right">
                  <Switch defaultChecked={s.enabled} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>


        <h2 className="text-sm font-medium text-foreground mb-3">
          Routing
        </h2>
        <p className="text-xs text-muted-foreground mb-6">
          Each (platform, operation) flows through a primary provider; if it errors or hits quota,
          the dashed edge takes over.
        </p>

        <RoutingGraph platform="instagram" />
        <RoutingGraph platform="tiktok" />
      </div>
    </section>
  );
}

/* ------------------------------ Routing graph ------------------------------ */

function RoutingGraph({ platform }: { platform: ScraperPlatform }) {
  const routingTable = useScopedRouting();
  const rows = routingTable.filter((r) => r.platform === platform);
  const providerIds = Array.from(
    new Set(rows.flatMap((r) => [r.primary, r.fallback].filter(Boolean) as string[])),
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const opRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const provRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [edges, setEdges] = useState<
    Array<{ d: string; kind: "primary" | "fallback"; key: string }>
  >([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(rows[0]?.operation ?? null);
  const selectedRow = rows.find((r) => r.operation === selected) ?? null;
  const active = hover ?? selected;

  useLayoutEffect(() => {
    const compute = () => {
      const c = containerRef.current;
      if (!c) return;
      const box = c.getBoundingClientRect();
      setSize({ w: box.width, h: box.height });
      const next: typeof edges = [];
      for (const r of rows) {
        const opEl = opRefs.current[r.operation];
        if (!opEl) continue;
        const o = opEl.getBoundingClientRect();
        const ox = o.right - box.left;
        const oy = o.top + o.height / 2 - box.top;

        const draw = (provId: string, kind: "primary" | "fallback") => {
          const pe = provRefs.current[provId];
          if (!pe) return;
          const p = pe.getBoundingClientRect();
          const px = p.left - box.left;
          const py = p.top + p.height / 2 - box.top;
          const mx = (ox + px) / 2;
          const d = `M ${ox} ${oy} C ${mx} ${oy}, ${mx} ${py}, ${px} ${py}`;
          next.push({ d, kind, key: `${r.operation}-${provId}-${kind}` });
        };
        draw(r.primary, "primary");
        if (r.fallback) draw(r.fallback, "fallback");
      }
      setEdges(next);
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [platform]);

  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[10px] text-muted-foreground">
          {platform}
        </span>
        <span className="h-px flex-1 bg-black/5" />
        <span className="text-[10px] text-muted-foreground">
          <span className="inline-block w-3 h-px bg-primary align-middle mr-1" /> primary
          <span className="inline-block w-3 border-t border-dashed border-zinc-500 align-middle ml-3 mr-1" />
          fallback
        </span>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-6">
        <div ref={containerRef} className="relative grid grid-cols-[1fr_2fr] gap-x-16 gap-y-2">
          {/* Operations column */}
          <div className="flex flex-col gap-2">
            <div className="text-[10px] text-muted-foreground pb-1">
              Operation
            </div>
            {rows.map((r) => {
              const isActive = active === r.operation;
              const isSelected = selected === r.operation;
              return (
                <div
                  key={r.operation}
                  ref={(el) => {
                    opRefs.current[r.operation] = el;
                  }}
                  onMouseEnter={() => setHover(r.operation)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => setSelected(r.operation)}
                  className={
                    "border rounded-lg px-3 py-2  text-xs flex items-center justify-between  cursor-pointer " +
                    (isSelected
                      ? "border-foreground bg-foreground/10 text-foreground"
                      : isActive
                        ? "border-foreground/60 bg-foreground/5 text-foreground"
                        : "border-black/10 bg-black/[0.02] text-muted-foreground ")
                  }
                >
                  <span>{r.operation}</span>
                  <span className="text-[9px] text-muted-foreground">
                    {r.fallback ? "1+1" : "1"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Providers column */}
          <div className="flex flex-col gap-2">
            <div className="text-[10px] text-muted-foreground pb-1">
              Provider
            </div>
            {providerIds.map((id) => {
              const s = scraperById[id];
              if (!s) return null;
              const relatedOp = rows.find(
                (r) => (r.primary === id || r.fallback === id) && r.operation === active,
              );
              const dim = active && !relatedOp;
              return (
                <div
                  key={id}
                  ref={(el) => {
                    provRefs.current[id] = el;
                  }}
                  className={
                    "border rounded-lg px-3 py-2 flex items-center justify-between gap-3  " +
                    (dim ? "opacity-30 " : "opacity-100 ") +
                    (relatedOp?.primary === id
                      ? "border-foreground/60 bg-foreground/5"
                      : relatedOp?.fallback === id
                        ? "border-muted-foreground/50 bg-muted/40 border-dashed"
                        : "border-border bg-muted/40")
                  }
                >
                  <div className="min-w-0">
                    <div className="text-xs text-foreground truncate flex items-center gap-1.5">
                      {s.name}
                      <span className="text-[10px] text-muted-foreground">· {s.vendor}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      ${s.pricePer1k.toFixed(2)}/1k · {(s.successRate * 100).toFixed(1)}% ·{" "}
                      {s.latencySec.toFixed(1)}s
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SVG overlay */}
          <svg
            className="absolute inset-0"
            width={size.w}
            height={size.h}
            style={{ overflow: "visible" }}
          >
            {edges.map((e) => {
              const op = e.key.split("-")[0];
              const isHover = active && op === active;
              const dim = active && !isHover;
              const isSelected = selected && op === selected;
              return (
                <g key={e.key}>
                  {/* invisible hit area */}
                  <path
                    d={e.d}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={() => setHover(op)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => setSelected(op)}
                  />
                  <path
                    d={e.d}
                    fill="none"
                    pointerEvents="none"
                    stroke={e.kind === "primary" ? "var(--foreground)" : "rgb(161 161 170)"}
                    strokeWidth={
                      isSelected ? (e.kind === "primary" ? 2.25 : 1.5) : e.kind === "primary" ? 1.5 : 1
                    }
                    strokeDasharray={e.kind === "fallback" ? "3 3" : undefined}
                    opacity={dim ? 0.12 : e.kind === "primary" ? 0.95 : 0.7}
                  />
                </g>
              );
            })}
          </svg>
        </div>

        {/* Detail panel */}
        <DetailPanel row={selectedRow} />
      </div>
    </div>
  );
}

function DetailPanel({
  row,
}: {
  row: { platform: ScraperPlatform; operation: string; primary: string; fallback?: string } | null;
}) {
  if (!row) {
    return (
      <div className="p-1 text-[11px] text-muted-foreground sticky top-20 self-start">
        Click an operation or edge to inspect.
      </div>
    );
  }
  const primary = scraperById[row.primary];
  const fallback = row.fallback ? scraperById[row.fallback] : null;
  return (
    <div className="p-1 flex flex-col gap-5 text-xs sticky top-20 self-start">
      <div>
        <div className="text-[10px] text-muted-foreground">
          Selection
        </div>
        <div className="mt-1 text-sm text-foreground">
          {row.platform} <span className="text-muted-foreground">/</span> {row.operation}
        </div>
      </div>

      <ProviderBlock label="Primary" scraper={primary} kind="primary" />
      <ProviderBlock label="Fallback" scraper={fallback} kind="fallback" />

      <div className="flex gap-4 text-[11px]">
        <button className="text-foreground">Swap</button>
        <button className="text-foreground">Test run</button>
      </div>
    </div>
  );
}

function ProviderBlock({
  label,
  scraper,
  kind,
}: {
  label: string;
  scraper: Scraper | null | undefined;
  kind: "primary" | "fallback";
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-muted-foreground">
          {label}
        </span>
        <span
          className={
            "text-[9px]   " +
            (kind === "primary" ? "text-foreground" : "text-muted-foreground")
          }
        >
          {kind === "primary" ? "solid" : "dashed"}
        </span>
      </div>
      {!scraper ? (
        <div className="text-[11px] text-muted-foreground">, none configured</div>
      ) : (
        <>
          <div className="text-sm text-foreground flex items-center gap-1.5">
            {scraper.name}
            <span className="text-[10px] text-muted-foreground">· {scraper.vendor}</span>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-y-1 text-[11px]">
            <Row k="cost" v={`$${scraper.pricePer1k.toFixed(2)}/1k`} />
            <Row k="success" v={`${(scraper.successRate * 100).toFixed(1)}%`} />
            <Row k="latency" v={`${scraper.latencySec.toFixed(1)}s`} />
            <Row
              k="quota"
              v={
                scraper.monthlyQuota === null
                  ? "unlimited"
                  : `${Math.round((scraper.usedThisMonth / scraper.monthlyQuota) * 100)}%`
              }
            />
            <Row k="auth" v={scraper.authMode} />
            <Row k="status" v={scraper.status} />
          </dl>
        </>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-muted-foreground text-right">{v}</dd>
    </>
  );
}

function Stat({ label, value, primary }: { label: string; value: string; primary?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground mb-1">
        {label}
      </div>
      <div className={"text-2xl font-medium " + (primary ? "text-foreground" : "text-foreground")}>
        {value}
      </div>
    </div>
  );
}

function QuotaBar({ scraper }: { scraper: Scraper }) {
  if (scraper.monthlyQuota === null) {
    return <span className="text-[11px] text-muted-foreground">unlimited</span>;
  }
  const pct = Math.min(100, (scraper.usedThisMonth / scraper.monthlyQuota) * 100);
  const color = pct > 90 ? "bg-muted-foreground" : pct > 70 ? "bg-muted-foreground" : "bg-primary";
  return (
    <div>
      <div className="text-[11px] tabular-nums text-muted-foreground">
        {fmt(scraper.usedThisMonth)}
        <span className="text-muted-foreground"> / {fmt(scraper.monthlyQuota)}</span>
      </div>
      <div className="h-0.5 bg-black/5 mt-1 overflow-hidden">
        <div className={"h-full " + color} style={{ width: pct + "%" }} />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Scraper["status"] }) {
  const map = {
    online: { color: "text-foreground" },
    degraded: { color: "text-muted-foreground" },
    down: { color: "text-muted-foreground" },
    disabled: { color: "text-muted-foreground" },
  } as const;
  const c = map[status as keyof typeof map] || map.disabled;
  return (
    <div className="flex items-center gap-1.5">
      <span className={"text-xs capitalize " + c.color}>{status}</span>
    </div>
  );
}

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "k";
  return n.toString();
}
