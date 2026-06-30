import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { projectById } from "../lib/mock-projects";
import { allCreators } from "../lib/mock-archive";
import { archivePostById } from "../lib/mock-archive";
import { fmtDate, fmtNum } from "../lib/date";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/projects/$projectId")({
  loader: ({ params }) => {
    const project = projectById.get(params.projectId);
    if (!project) throw notFound();
    return { project };
  },
  notFoundComponent: () => (
    <div className="px-8 py-16 text-center text-sm text-muted-foreground">
      Project not found. <Link to="/projects" className="underline">Back to projects</Link>
    </div>
  ),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { project: p } = Route.useLoaderData();

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <Link
        to="/projects"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-6"
      >
        <ArrowLeft className="size-3.5" /> All projects
      </Link>

      <header className="flex items-start justify-between mb-10 gap-6">
        <div className="flex items-start gap-4 min-w-0">
          <span className="size-3 rounded-sm mt-2 shrink-0" style={{ background: p.color }} />
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold truncate">{p.name}</h1>
              <span className="text-[10px] text-muted-foreground border border-black/10 rounded px-1.5 py-0.5">
                {p.mode === "auto" ? "Auto-scrape" : "Curated"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{p.description}</p>
            <div className="flex items-center gap-2 mt-3">
              {p.tags.map((t: string) => (
                <span key={t} className="text-[10px] text-muted-foreground">
                  #{t}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {p.mode === "auto" && (
            <button className="inline-flex items-center gap-2 text-sm border border-black/10 rounded-md px-3 py-2">
              {p.status === "paused" ? "Resume" : "Pause"}
            </button>
          )}
          <button className="inline-flex items-center gap-2 text-sm border border-black/10 rounded-md px-3 py-2">
            Configure
          </button>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-8 mb-10 text-sm">
        <Meta label="Mode" value={p.mode === "auto" ? "Auto-scrape" : "Curated"} />
        <Meta
          label={p.mode === "auto" ? "Scrape interval" : "Items"}
          value={
            p.mode === "auto" && p.scrapeIntervalMinutes
              ? `every ${formatInterval(p.scrapeIntervalMinutes)}`
              : `${p.postIds.length} pinned`
          }
        />
        <Meta label="Owner" value={p.owner} />
        <Meta label="Updated" value={fmtDate(p.updatedAt)} />
      </div>

      {p.mode === "auto" ? <AutoBody project={p} /> : <ManualBody project={p} />}
    </div>
  );
}

function AutoBody({ project: p }: { project: any }) {
  const creators = p.creatorIds
    .map((id: string) => allCreators.find((c) => c.id === id))
    .filter((c: any): c is any => Boolean(c));

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs text-muted-foreground flex items-center gap-2">
          Watched creators · {creators.length}
        </h2>
        <button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          Add creator
        </button>
      </div>
      <div className="">
        {creators.map((c: any) => (
          <div key={c.id} className="grid grid-cols-12 gap-4 py-3 items-center text-sm">
            <div className="col-span-1 text-[10px] text-muted-foreground">
              {c.platform}
            </div>
            <div className="col-span-4 font-medium truncate">@{c.username}</div>
            <div className="col-span-3 text-muted-foreground truncate">{c.displayName}</div>
            <div className="col-span-2 text-xs text-muted-foreground tabular-nums">
              {fmtNum(c.followers)} followers
            </div>
            <div className="col-span-2 text-xs text-muted-foreground text-right">
              added {fmtDate(c.addedAt)}
            </div>
          </div>
        ))}
        {creators.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">No creators yet.</div>
        )}
      </div>
    </section>
  );
}

function ManualBody({ project: p }: { project: any }) {
  const posts = p.postIds
    .map((id: string) => archivePostById.get(id))
    .filter((x: any): x is any => Boolean(x));

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs text-muted-foreground flex items-center gap-2">
          Pinned posts · {posts.length}
        </h2>
        <button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          Pin post
        </button>
      </div>
      <div className="">
        {posts.map((post: any) => (
          <Link
            key={post.id}
            to="/archive/$postId"
            params={{ postId: post.id }}
            className="grid grid-cols-12 gap-4 py-3 items-center text-sm hover:bg-black/[0.02] -mx-2 px-2 rounded-md"
          >
            <div className="col-span-1 text-[10px] text-muted-foreground">
              {post.platform}
            </div>
            <div className="col-span-2 text-xs text-muted-foreground truncate">{post.creatorName}</div>
            <div className="col-span-5 truncate">{post.caption || <span className="text-muted-foreground italic">no caption</span>}</div>
            <div className="col-span-2 text-xs text-muted-foreground tabular-nums text-right">
              {fmtNum(post.latestEngagement.views)} views
            </div>
            <div className="col-span-2 text-xs text-muted-foreground text-right">
              {fmtDate(post.capturedAt)}
            </div>
          </Link>
        ))}
        {posts.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">No pinned posts yet.</div>
        )}
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm mt-1">{value}</div>
    </div>
  );
}

function formatInterval(min: number) {
  if (min < 60) return `${min}m`;
  if (min < 60 * 24) return `${Math.round(min / 60)}h`;
  return `${Math.round(min / (60 * 24))}d`;
}