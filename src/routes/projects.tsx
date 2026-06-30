import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { type ProjectMode } from "../lib/mock-projects";
import { useScopedProjects } from "../lib/org-scope";
import { fmtDate, fmtNum } from "../lib/date";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects, Vault" },
      { name: "description", content: "Group watched creators or hand-picked posts into projects." },
    ],
  }),
  component: ProjectsPage,
});

type Filter = "all" | "auto" | "manual" | "active" | "paused" | "archived";

function ProjectsPage() {
  const projects = useScopedProjects();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return projects.filter((p) => {
      if (filter === "auto" || filter === "manual") {
        if (p.mode !== filter) return false;
      } else if (filter !== "all") {
        if (p.status !== filter) return false;
      }
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle) ||
        p.tags.some((t) => t.toLowerCase().includes(needle))
      );
    });
  }, [q, filter, projects]);

  const stats = useMemo(() => {
    const auto = projects.filter((p) => p.mode === "auto");
    const manual = projects.filter((p) => p.mode === "manual");
    const watched = new Set(auto.flatMap((p) => p.creatorIds)).size;
    const pinned = manual.reduce((acc, p) => acc + p.postIds.length, 0);
    return { total: projects.length, auto: auto.length, manual: manual.length, watched, pinned };
  }, [projects]);

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <header className="flex items-end justify-between mb-10">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Group watched creators for ongoing scraping, or pin individual posts from anyone.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background text-sm font-medium px-3 py-2 hover:bg-foreground/90">
          New project
        </button>
      </header>

      <div className="grid grid-cols-5 gap-8 mb-10 text-sm">
        <Stat label="Projects" value={String(stats.total)} />
        <Stat label="Auto-scraping" value={String(stats.auto)} />
        <Stat label="Curated" value={String(stats.manual)} />
        <Stat label="Watched creators" value={fmtNum(stats.watched)} />
        <Stat label="Pinned posts" value={fmtNum(stats.pinned)} />
      </div>

      <div className="flex items-center gap-4 pb-3 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by name, description, tag..."
          className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted-foreground"
        />
        <div className="flex items-center gap-1 text-xs">
          {(["all", "auto", "manual", "active", "paused", "archived"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={
                "px-2 py-1 rounded-lg " +
                (filter === f ? "bg-foreground text-background" : "text-muted-foreground ")
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="">
        <div className="grid grid-cols-12 gap-4 py-2 -mx-2 px-2 text-[10px] text-muted-foreground border-b">
          <div className="col-span-1"></div>
          <div className="col-span-4">Name</div>
          <div className="col-span-2">Mode</div>
          <div className="col-span-1">Size</div>
          <div className="col-span-2">Schedule</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-1 text-right">Updated</div>
        </div>
        {filtered.map((p) => (
          <ProjectRow key={p.id} project={p} />
        ))}
        {filtered.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">No projects match.</div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function ProjectRow({ project: p }: { project: ReturnType<typeof useScopedProjects>[number] }) {
  const count = p.mode === "auto" ? p.creatorIds.length : p.postIds.length;
  const countLabel = p.mode === "auto" ? "creators" : "posts";
  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: p.id }}
      className="grid grid-cols-12 gap-4 py-4 items-center hover:bg-black/[0.02] -mx-2 px-2 rounded-md"
    >
      <div className="col-span-1 flex justify-center">
        <span className="size-2 rounded-sm" style={{ background: p.color }} />
      </div>
      <div className="col-span-4">
        <div className="text-sm font-medium truncate">{p.name}</div>
        <div className="text-xs text-muted-foreground truncate mt-0.5">{p.description}</div>
      </div>
      <div className="col-span-2 flex items-center gap-2 text-xs text-muted-foreground">
        {p.mode === "auto" ? "Auto" : "Curated"}
      </div>
      <div className="col-span-1 text-sm tabular-nums">{count} <span className="text-muted-foreground text-xs">{countLabel}</span></div>
      <div className="col-span-2 text-xs text-muted-foreground">
        {p.mode === "auto" && p.scrapeIntervalMinutes
          ? `every ${formatInterval(p.scrapeIntervalMinutes)}`
          : ","}
      </div>
      <div className="col-span-1">
        <StatusDot status={p.status} />
      </div>
      <div className="col-span-1 text-xs text-muted-foreground text-right">
        {fmtDate(p.updatedAt)}
      </div>
    </Link>
  );
}

function StatusDot({ status }: { status: "active" | "paused" | "archived" }) {
  const map: Record<typeof status, { label: string }> = {
    active: { label: "Active" },
    paused: { label: "Paused" },
    archived: { label: "Archived" },
  };
  const v = map[status];
  return (
    <span className="text-xs text-muted-foreground">
      {v.label}
    </span>
  );
}

function formatInterval(min: number) {
  if (min < 60) return `${min}m`;
  if (min < 60 * 24) return `${Math.round(min / 60)}h`;
  return `${Math.round(min / (60 * 24))}d`;
}

export type ProjectModeT = ProjectMode;