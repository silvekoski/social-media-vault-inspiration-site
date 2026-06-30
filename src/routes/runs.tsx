import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import type { Run } from "../lib/mock-data";
import { useScopedRuns } from "../lib/org-scope";
import { scraperById } from "../lib/mock-scrapers";
import { fmtDate } from "../lib/date";
import {
  buildRunArtifacts,
  durationLabel,
  runTitle,
} from "../lib/run-inspect";

export const Route = createFileRoute("/runs")({
  head: () => ({
    meta: [
      { title: "Runs , Vault" },
      { name: "description", content: "Run history and active runs" },
    ],
  }),
  component: RunsPage,
});

function RunsPage() {
  const runs = useScopedRuns();
  const [selected, setSelected] = useState<Run | null>(null);

  return (
    <section className="py-10">
      <div className="max-w-6xl mx-auto px-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Run History</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Discovery, engagement, and capture runs. Select a row to inspect its output.
            </p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded hover:bg-primary/90">
            Trigger Manual Run
          </button>
        </div>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2 font-medium text-muted-foreground">Run ID</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Kind</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Platform</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Scraper</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Items</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Scraper Cost</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">AI Cost</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Started</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Duration</th>
              <th className="px-4 py-2 font-medium text-muted-foreground sr-only">Inspect</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {runs.map((run) => {
              const sc = scraperById[run.scraperId];
              const isSelected = selected?.id === run.id;
              return (
                <tr
                  key={run.id}
                  onClick={() => setSelected(run)}
                  className={
                    "group cursor-pointer hover:bg-accent/50 " +
                    (isSelected ? "bg-accent" : "")
                  }
                >
                  <td className="px-4 py-2 text-xs text-foreground">{run.id}</td>
                  <td className="px-4 py-2 capitalize">{run.kind}</td>
                  <td className="px-4 py-2 text-muted-foreground">{run.platform ?? ","}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{sc?.name ?? run.scraperId}</span>
                      <span className="text-[10px] text-muted-foreground">, {sc?.vendor}</span>
                      {run.scraperFallbackFrom && (
                        <span
                          title={`fallback from ${scraperById[run.scraperFallbackFrom]?.name}`}
                          className="text-[10px] text-muted-foreground"
                        >
                          fallback
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-4 py-2 text-xs">{run.itemCount}</td>
                  <td className="px-4 py-2 text-xs">${run.scraperCost.toFixed(2)}</td>
                  <td className="px-4 py-2 text-xs">
                    ${Object.values(run.aiCost).reduce((a, b) => a + b, 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{fmtDate(run.startedAt)}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{durationLabel(run)}</td>
                  <td className="px-4 py-2 text-right">
                    <span className="text-xs underline text-muted-foreground group-hover:text-foreground">
                      Inspect
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <RunInspector run={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  return <span className="text-xs capitalize text-muted-foreground">{status}</span>;
}

type InspectTab = "dataset" | "log" | "info";

function RunInspector({ run, onClose }: { run: Run; onClose: () => void }) {
  const [tab, setTab] = useState<InspectTab>("dataset");
  const [logFilter, setLogFilter] = useState<"all" | "info" | "warning" | "error">("all");
  const artifacts = buildRunArtifacts(run);
  const sc = scraperById[run.scraperId];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const logLines =
    logFilter === "all"
      ? artifacts.log
      : artifacts.log.filter((l) => l.level === logFilter);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-foreground/20"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="w-full max-w-xl bg-background border-l border-border h-full overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground/70">
              {run.kind} run
            </p>
            <h2 className="text-lg font-semibold text-foreground truncate">
              {runTitle(run)}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {sc?.name ?? run.scraperId}
              {sc?.vendor ? ` · ${sc.vendor}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close run inspector"
            className="shrink-0 rounded border border-border px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Close
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Run details */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Run details</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Detail label="Status" value={<span className="capitalize">{run.status}</span>} />
              <Detail label="Run ID" value={run.id} />
              <Detail label="Started" value={fmtDate(run.startedAt)} />
              <Detail label="Finished" value={run.finishedAt ? fmtDate(run.finishedAt) : "—"} />
              <Detail label="Duration" value={durationLabel(run)} />
              <Detail label="Origin" value={run.triggeredBy ? `Manual · ${run.triggeredBy}` : "Scheduled"} />
              {run.scraperFallbackFrom && (
                <Detail
                  label="Fallback from"
                  value={scraperById[run.scraperFallbackFrom]?.name ?? run.scraperFallbackFrom}
                />
              )}
            </dl>
          </div>

          {/* Statistics */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Statistics</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Detail label="Dataset items" value={run.itemCount.toLocaleString()} />
              <Detail label="Compute units" value={artifacts.computeUnits.toFixed(3)} />
              <Detail label="Avg memory" value={`${artifacts.memAvgMb} MB`} />
              <Detail label="Run time" value={`${artifacts.runTimeSecs}s`} />
              <Detail label="Scraper cost" value={`$${run.scraperCost.toFixed(2)}`} />
              <Detail
                label="AI cost"
                value={`$${Object.values(run.aiCost).reduce((a, b) => a + b, 0).toFixed(2)}`}
              />
            </dl>
          </div>

          {/* Storage */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Storage</h3>
            <div className="space-y-2">
              <CopyRow label="Default dataset" value={artifacts.datasetId} />
              <CopyRow label="Key-value store" value={artifacts.keyValueStoreId} />
              <CopyRow label="Request queue" value={artifacts.requestQueueId} />
            </div>
          </div>

          {/* Tabs */}
          <div>
            <div className="flex items-center gap-1 border-b border-border">
              {(["dataset", "log", "info"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={
                    "px-3 py-2 text-sm capitalize -mb-px border-b-2 " +
                    (tab === t
                      ? "border-foreground text-foreground font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground")
                  }
                >
                  {t === "dataset" ? `Dataset (${run.itemCount})` : t}
                </button>
              ))}
            </div>

            <div className="pt-4">
              {tab === "dataset" && <DatasetTab artifacts={artifacts} run={run} />}
              {tab === "log" && (
                <div>
                  <div className="flex items-center gap-1 mb-3">
                    {(["all", "info", "warning", "error"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setLogFilter(f)}
                        className={
                          "px-2.5 py-1 text-xs capitalize rounded " +
                          (logFilter === f
                            ? "bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:text-foreground")
                        }
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                  <div className="rounded border border-border divide-y divide-border">
                    {logLines.map((line, i) => (
                      <div key={i} className="flex gap-3 px-3 py-1.5 text-xs">
                        <span className="shrink-0 text-muted-foreground tabular-nums">
                          {line.time}
                        </span>
                        <span className="shrink-0 w-14 uppercase text-muted-foreground">
                          {line.level}
                        </span>
                        <span className="text-foreground">{line.msg}</span>
                      </div>
                    ))}
                    {logLines.length === 0 && (
                      <p className="px-3 py-2 text-xs text-muted-foreground">
                        No {logFilter} entries.
                      </p>
                    )}
                  </div>
                </div>
              )}
              {tab === "info" && (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <Detail label="Actor" value={sc?.name ?? run.scraperId} />
                  <Detail label="Vendor" value={sc?.vendor ?? "—"} />
                  <Detail label="Platform" value={run.platform ?? "—"} />
                  <Detail label="Kind" value={<span className="capitalize">{run.kind}</span>} />
                  <Detail label="Build" value={artifacts.build} />
                  <Detail label="Exit code" value={run.status === "success" ? "0" : run.status === "error" ? "1" : "—"} />
                </dl>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground mt-0.5 break-words">{value}</dd>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded border border-border px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm text-foreground truncate">{value}</div>
      </div>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 text-xs underline text-muted-foreground hover:text-foreground"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function DatasetTab({
  artifacts,
  run,
}: {
  artifacts: ReturnType<typeof buildRunArtifacts>;
  run: Run;
}) {
  if (run.itemCount === 0 || artifacts.datasetSample.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This run produced no dataset items.
      </p>
    );
  }
  const columns = Object.keys(artifacts.datasetSample[0]);
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">
        Showing {artifacts.datasetSample.length} of {run.itemCount.toLocaleString()} items
      </p>
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border">
              {columns.map((c) => (
                <th key={c} className="px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {artifacts.datasetSample.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c} className="px-3 py-2 text-foreground whitespace-nowrap">
                    {String(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
