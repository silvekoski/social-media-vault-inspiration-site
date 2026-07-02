import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  useScopedBaseCreators,
  useScopedRuns,
  useScopedArchive,
} from "../lib/org-scope";
import { fmtDate } from "../lib/date";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview , Vault" },
      { name: "description", content: "Vault overview dashboard" },
    ],
  }),
  component: OverviewPage,
});

function fmtNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
}

function OverviewPage() {
  const creators = useScopedBaseCreators();
  const runs = useScopedRuns();
  const archive = useScopedArchive();

  const activeRuns = runs.filter((r) => r.status === "running");

  const stats = useMemo(() => {
    const finished = runs.filter(
      (r) => r.status === "success" || r.status === "error",
    );
    const successful = runs.filter((r) => r.status === "success");
    const successRate =
      finished.length > 0
        ? Math.round((successful.length / finished.length) * 100)
        : 100;

    const scraperSpend = runs.reduce((sum, r) => sum + r.scraperCost, 0);
    const aiSpend = runs.reduce(
      (sum, r) => sum + Object.values(r.aiCost).reduce((a, b) => a + b, 0),
      0,
    );
    const itemsCaptured = runs.reduce((sum, r) => sum + r.itemCount, 0);
    const totalFollowers = creators.reduce((sum, c) => sum + c.followers, 0);
    const activeCreators = creators.filter((c) => c.active).length;

    // avg run duration (minutes) for finished runs with a finishedAt
    const durations = runs
      .filter((r) => r.finishedAt)
      .map(
        (r) =>
          (new Date(r.finishedAt!).getTime() -
            new Date(r.startedAt).getTime()) /
          60000,
      )
      .filter((m) => m > 0);
    const avgDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

    return {
      successRate,
      scraperSpend,
      aiSpend,
      itemsCaptured,
      totalFollowers,
      activeCreators,
      avgDuration,
    };
  }, [runs, creators]);

  // Platform breakdown of the roster's catalogued creators.
  const platformBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of creators) counts[c.platform] = (counts[c.platform] ?? 0) + 1;
    const total = creators.length || 1;
    return (["tiktok", "instagram", "youtube"] as const).map((p) => ({
      platform: p,
      count: counts[p] ?? 0,
      pct: Math.round(((counts[p] ?? 0) / total) * 100),
    }));
  }, [creators]);

  // Runs grouped by day for the activity chart.
  const runActivity = useMemo(() => {
    const byDay = new Map<string, { runs: number; items: number }>();
    for (const r of runs) {
      const day = new Date(r.startedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const entry = byDay.get(day) ?? { runs: 0, items: 0 };
      entry.runs += 1;
      entry.items += r.itemCount;
      byDay.set(day, entry);
    }
    return Array.from(byDay.entries())
      .map(([day, v]) => ({ day, ...v }))
      .slice(-10);
  }, [runs]);

  return (
    <section className="py-10">
      <div className="max-w-6xl mx-auto px-10">
        {/* Telemetry Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 mb-10">
          <Stat label="Assets Catalogued" value={fmtNum(archive.length)} />
          <Stat
            label="Active Creators"
            value={stats.activeCreators.toString()}
            sub={`${creators.length} tracked`}
          />
          <Stat label="Audience Reach" value={fmtNum(stats.totalFollowers)} />
          <Stat label="Items Captured" value={fmtNum(stats.itemsCaptured)} />
          <Stat label="Scraper Spend" value={`$${stats.scraperSpend.toFixed(2)}`} />
          <Stat label="AI Spend" value={`$${stats.aiSpend.toFixed(2)}`} />
          <Stat label="Run Success Rate" value={`${stats.successRate}%`} />
          <Stat
            label="Avg Run Duration"
            value={
              stats.avgDuration > 0 ? `${stats.avgDuration.toFixed(0)}m` : "—"
            }
          />
        </div>

        {/* Activity + Platform breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 rounded-lg border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-foreground">Run Activity</h2>
              <span className="text-xs text-muted-foreground">Items captured per day</span>
            </div>
            {runActivity.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No run activity yet.
              </div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={runActivity} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={{ stroke: "var(--border)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--accent)" }}
                      contentStyle={{
                        background: "var(--background)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="items" fill="var(--foreground)" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border p-5">
            <h2 className="text-sm font-medium text-foreground mb-4">Creators by Platform</h2>
            <div className="flex flex-col gap-4">
              {platformBreakdown.map((p) => (
                <div key={p.platform}>
                  <div className="flex items-center justify-between mb-1.5 text-sm">
                    <span className="capitalize text-foreground">{p.platform}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {p.count} · {p.pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-foreground"
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active Runs */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-foreground">Active Runs</h2>
            <span className="text-xs text-muted-foreground">{activeRuns.length} in progress</span>
          </div>
          {activeRuns.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">
              No active runs. Discovery and engagement schedules are idle.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Run ID</th>
                    <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Kind</th>
                    <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Platform</th>
                    <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                    <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Items</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activeRuns.map((run) => (
                    <tr key={run.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{run.id}</td>
                      <td className="px-4 py-3 capitalize">{run.kind}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{run.platform}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={run.status} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{run.itemCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Runs */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-foreground">Recent Runs</h2>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Kind</th>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Platform</th>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Started</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {runs.slice(0, 5).map((run) => (
                  <tr key={run.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 capitalize">{run.kind}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{run.platform ?? ","}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(run.startedAt)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs">${run.scraperCost.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </div>
      <div className="text-2xl font-medium text-foreground tabular-nums">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "success" || status === "running";
  const dot = isActive ? "bg-foreground" : "bg-muted-foreground/50";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
      <span className={"h-2 w-2 rounded-full " + dot} aria-hidden="true" />
      <span className="capitalize">{status}</span>
    </span>
  );
}
