import { createFileRoute } from "@tanstack/react-router";
import type { Run } from "../lib/mock-data";
import { useScopedRuns } from "../lib/org-scope";
import { scraperById } from "../lib/mock-scrapers";
import { fmtDate } from "../lib/date";

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
  return (
    <section className="py-10">
      <div className="max-w-6xl mx-auto px-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Run History</h1>
            <p className="text-sm text-muted-foreground mt-1">Discovery, engagement, and capture runs</p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90">
            Trigger Manual Run
          </button>
        </div>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/5">
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
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {runs.map((run) => {
              const sc = scraperById[run.scraperId];
              return (
                <tr key={run.id} className="group cursor-pointer">
                  <td className="px-4 py-2 text-xs text-foreground">{run.id}</td>
                  <td className="px-4 py-2 capitalize">{run.kind}</td>
                  <td className="px-4 py-2 text-muted-foreground">{run.platform ?? ","}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{sc?.name ?? run.scraperId}</span>
                      <span className="text-[10px] text-muted-foreground">
                        , {sc?.vendor}
                      </span>
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
                  <td className="px-4 py-2 text-xs text-muted-foreground">{duration(run)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="text-xs capitalize text-muted-foreground">{status}</span>
  );
}

function duration(run: Run) {
  if (!run.finishedAt) return ",";
  const s = new Date(run.startedAt).getTime();
  const f = new Date(run.finishedAt).getTime();
  const min = Math.round((f - s) / 60000);
  return min + "m";
}