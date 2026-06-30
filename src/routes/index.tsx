import { createFileRoute } from "@tanstack/react-router";
import { useScopedBaseCreators, useScopedRuns } from "../lib/org-scope";
import { fmtDate } from "../lib/date";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview , Vault" },
      { name: "description", content: "Vault overview dashboard" },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const creators = useScopedBaseCreators();
  const runs = useScopedRuns();
  const activeRuns = runs.filter((r) => r.status === "running");
  const totalCreators = creators.length;
  const totalStorage = "847 GB";

  return (
    <section className="py-10">
      <div className="max-w-6xl mx-auto px-10">
        {/* Telemetry Header */}
        <div className="grid grid-cols-4 gap-8 mb-10">
          <Stat label="Assets Catalogued" value="1,240" />
          <Stat label="Active Creators" value={totalCreators.toString()} />
          <Stat label="Storage Used" value={totalStorage} primary />
          <Stat label="Integrity Score" value="99.9%" />
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
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="px-4 py-2 font-medium text-muted-foreground">Run ID</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Kind</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Platform</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-2 font-medium text-muted-foreground text-right">Items</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {activeRuns.map((run) => (
                  <tr key={run.id} className="">
                    <td className="px-4 py-2 text-xs">{run.id}</td>
                    <td className="px-4 py-2 capitalize">{run.kind}</td>
                    <td className="px-4 py-2">{run.platform}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">Running</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right">{run.itemCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Recent Runs */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-foreground">Recent Runs</h2>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/5">
                <th className="px-4 py-2 font-medium text-muted-foreground">Kind</th>
                <th className="px-4 py-2 font-medium text-muted-foreground">Platform</th>
                <th className="px-4 py-2 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2 font-medium text-muted-foreground">Started</th>
                <th className="px-4 py-2 font-medium text-muted-foreground text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {runs.slice(0, 5).map((run) => (
                <tr key={run.id} className="group">
                  <td className="px-4 py-2 capitalize">{run.kind}</td>
                  <td className="px-4 py-2">{run.platform ?? ","}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{fmtDate(run.startedAt)}</td>
                  <td className="px-4 py-2 text-right text-xs">${run.scraperCost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  primary,
}: {
  label: string;
  value: string;
  primary?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <div className={"text-2xl font-medium " + (primary ? "text-foreground" : "text-foreground")}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string }> = {
    success: { color: "text-foreground" },
    error: { color: "text-muted-foreground" },
    running: { color: "text-foreground" },
    cancelled: { color: "text-muted-foreground" },
    pending: { color: "text-muted-foreground" },
  };
  const config = map[status] || map.pending;
  return (
    <div className="flex items-center gap-1.5">
      <span className={"text-xs capitalize " + config.color}>{status}</span>
    </div>
  );
}