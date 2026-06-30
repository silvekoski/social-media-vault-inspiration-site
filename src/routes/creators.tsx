import { createFileRoute } from "@tanstack/react-router";
import { useScopedBaseCreators } from "../lib/org-scope";

export const Route = createFileRoute("/creators")({
  head: () => ({
    meta: [
      { title: "Creators , Vault" },
      { name: "description", content: "Manage watched creators" },
    ],
  }),
  component: CreatorsPage,
});

function CreatorsPage() {
  const creators = useScopedBaseCreators();
  return (
    <section className="py-10">
      <div className="max-w-6xl mx-auto px-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Creators</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage watched creators across platforms</p>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90">
            Add Creator
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Creator</th>
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Platform</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Followers</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Posts</th>
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Discovered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {creators.map((c) => (
                <tr key={c.id} className="group transition-colors hover:bg-accent/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={`https://picsum.photos/seed/${c.username}/64/64?grayscale`}
                        alt=""
                        className="h-8 w-8 shrink-0 object-cover bg-muted rounded-lg"
                        loading="lazy"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-foreground font-medium truncate">{c.displayName}</span>
                        <span className="font-mono text-[11px] text-muted-foreground truncate">@{c.username}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{c.platform}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">{fmtNumber(c.followers)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">{c.postCount.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <ActiveBadge active={c.active} watched={c.watched} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.discoveredVia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </section>
  );
}

function ActiveBadge({ active, watched }: { active: boolean; watched: boolean }) {
  const label = !watched ? "Unwatched" : active ? "Active" : "Paused";
  const dot = !watched
    ? "bg-muted-foreground/40"
    : active
      ? "bg-foreground"
      : "bg-muted-foreground/60";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-foreground">
      <span className={"h-2 w-2 rounded-full " + dot} aria-hidden="true" />
      {label}
    </span>
  );
}

function fmtNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}
