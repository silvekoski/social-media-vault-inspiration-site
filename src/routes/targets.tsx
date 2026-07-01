import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { allCreators, archivePostById, archivePosts } from "../lib/mock-archive";
import { useScopedProjects, useScopedRoster } from "../lib/org-scope";
import { useCurrentProjectId } from "../lib/current-project";
import { fmtDate, fmtNum } from "../lib/date";
import { Plus, Search, X } from "lucide-react";

export const Route = createFileRoute("/targets")({
  head: () => ({
    meta: [
      { title: "Scrape Targets, Vault" },
      {
        name: "description",
        content: "Adjust which creators or posts are scraped per project.",
      },
    ],
  }),
  component: TargetsPage,
});

const creatorById = new Map(allCreators.map((c) => [c.id, c] as const));

type CreatorEdit = { ids: string[]; active: Record<string, boolean> };

function TargetsPage() {
  const projects = useScopedProjects();
  const roster = useScopedRoster();
  const currentProjectId = useCurrentProjectId();

  // Default the selector to the active project, else the first scoped project.
  const initialId =
    currentProjectId !== "all" && projects.some((p) => p.id === currentProjectId)
      ? currentProjectId
      : (projects[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState(initialId);

  const project = projects.find((p) => p.id === selectedId) ?? projects[0];

  // Per-project local edits, seeded lazily from project data.
  const [creatorEdits, setCreatorEdits] = useState<Record<string, CreatorEdit>>({});
  const [postEdits, setPostEdits] = useState<Record<string, string[]>>({});

  if (!project) {
    return (
      <div className="px-8 py-16 text-center text-sm text-muted-foreground">
        No projects in this organization yet.
      </div>
    );
  }

  const creatorEdit: CreatorEdit =
    creatorEdits[project.id] ??
    {
      ids: project.creatorIds,
      active: Object.fromEntries(project.creatorIds.map((id) => [id, true])),
    };
  const pinnedIds = postEdits[project.id] ?? project.postIds;

  function updateCreators(next: CreatorEdit) {
    setCreatorEdits((s) => ({ ...s, [project!.id]: next }));
  }
  function updatePosts(next: string[]) {
    setPostEdits((s) => ({ ...s, [project!.id]: next }));
  }

  const dirty =
    project.mode === "auto"
      ? creatorEdits[project.id] !== undefined
      : postEdits[project.id] !== undefined;

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <header className="flex items-end justify-between mb-8 gap-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Scrape Targets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Adjust which creators or posts each project scrapes. Changes apply to the next run.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {dirty && (
            <span className="text-xs text-muted-foreground">Unsaved changes</span>
          )}
          <button
            disabled={!dirty}
            className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background text-sm font-medium px-3 py-2 hover:bg-foreground/90 disabled:opacity-40"
          >
            Save changes
          </button>
        </div>
      </header>

      {/* Project selector + meta */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-8">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Project</span>
          <div className="relative inline-flex items-center">
            <select
              value={project.id}
              onChange={(e) => setSelectedId(e.target.value)}
              className="appearance-none rounded-md border border-border bg-transparent pl-3 pr-8 py-1.5 text-sm font-medium outline-none hover:bg-accent/50 cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </label>
        <Meta label="Mode" value={project.mode === "auto" ? "Auto-scrape" : "Curated"} />
        <Meta
          label="Schedule"
          value={
            project.mode === "auto" && project.scrapeIntervalMinutes
              ? `every ${formatInterval(project.scrapeIntervalMinutes)}`
              : "manual"
          }
        />
        <Meta
          label="Targets"
          value={
            project.mode === "auto"
              ? `${creatorEdit.ids.length} creators`
              : `${pinnedIds.length} posts`
          }
        />
        <Meta label="Status" value={cap(project.status)} />
      </div>

      {project.mode === "auto" ? (
        <CreatorTargets
          edit={creatorEdit}
          roster={roster}
          onChange={updateCreators}
        />
      ) : (
        <PostTargets pinnedIds={pinnedIds} onChange={updatePosts} />
      )}
    </div>
  );
}

/* ---------------- Auto: creator targets ---------------- */

function CreatorTargets({
  edit,
  roster,
  onChange,
}: {
  edit: CreatorEdit;
  roster: ReturnType<typeof useScopedRoster>;
  onChange: (next: CreatorEdit) => void;
}) {
  const [q, setQ] = useState("");

  const watched = edit.ids
    .map((id) => creatorById.get(id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const watchedSet = new Set(edit.ids);
  const needle = q.trim().toLowerCase();
  const candidates = roster
    .filter((c) => !watchedSet.has(c.id))
    .filter(
      (c) =>
        !needle ||
        c.username.toLowerCase().includes(needle) ||
        c.displayName.toLowerCase().includes(needle),
    )
    .slice(0, 40);

  function removeCreator(id: string) {
    const { [id]: _drop, ...restActive } = edit.active;
    onChange({ ids: edit.ids.filter((x) => x !== id), active: restActive });
  }
  function addCreator(id: string) {
    onChange({ ids: [id, ...edit.ids], active: { ...edit.active, [id]: true } });
  }
  function toggleActive(id: string) {
    onChange({ ...edit, active: { ...edit.active, [id]: !(edit.active[id] ?? true) } });
  }

  const activeCount = watched.filter((c) => edit.active[c.id] ?? true).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Watched */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground">
            Watched creators · {watched.length}
          </h2>
          <span className="text-xs text-muted-foreground">{activeCount} active</span>
        </div>
        <div className="rounded-lg border border-border divide-y divide-border">
          {watched.map((c) => {
            const isActive = edit.active[c.id] ?? true;
            return (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2.5">
                <img
                  src={`https://picsum.photos/seed/${c.username}/48/48?grayscale`}
                  alt=""
                  className="size-8 rounded-lg bg-muted object-cover shrink-0"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">@{c.username}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.platform} · {fmtNum(c.followers)} followers
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(c.id)}
                  className={
                    "shrink-0 rounded border px-2 py-1 text-[11px] " +
                    (isActive
                      ? "border-border text-foreground"
                      : "border-border text-muted-foreground")
                  }
                  title={isActive ? "Pause scraping this creator" : "Resume scraping"}
                >
                  {isActive ? "Active" : "Paused"}
                </button>
                <button
                  onClick={() => removeCreator(c.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  title="Remove from project"
                  aria-label={`Remove @${c.username}`}
                >
                  <X className="size-4" />
                </button>
              </div>
            );
          })}
          {watched.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No creators watched. Add some from the roster.
            </div>
          )}
        </div>
      </section>

      {/* Add from roster */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Add from roster
        </h2>
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 mb-2">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search creators by handle or name"
            className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground"
          />
        </div>
        <div className="rounded-lg border border-border divide-y divide-border max-h-[28rem] overflow-y-auto">
          {candidates.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-3 py-2.5">
              <img
                src={`https://picsum.photos/seed/${c.username}/48/48?grayscale`}
                alt=""
                className="size-8 rounded-lg bg-muted object-cover shrink-0"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">@{c.username}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {c.platform} · {fmtNum(c.followers)} followers
                </div>
              </div>
              <button
                onClick={() => addCreator(c.id)}
                className="shrink-0 inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] text-foreground hover:bg-accent"
              >
                <Plus className="size-3" /> Add
              </button>
            </div>
          ))}
          {candidates.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {needle ? "No matching creators." : "All roster creators are added."}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ---------------- Manual: post targets ---------------- */

function PostTargets({
  pinnedIds,
  onChange,
}: {
  pinnedIds: string[];
  onChange: (next: string[]) => void;
}) {
  const [q, setQ] = useState("");

  const pinned = pinnedIds
    .map((id) => archivePostById.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const pinnedSet = new Set(pinnedIds);
  const needle = q.trim().toLowerCase();
  const candidates = archivePosts
    .filter((p) => !pinnedSet.has(p.id))
    .filter(
      (p) =>
        !needle ||
        p.caption.toLowerCase().includes(needle) ||
        p.creatorName.toLowerCase().includes(needle),
    )
    .slice(0, 40);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Pinned */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Pinned posts · {pinned.length}
        </h2>
        <div className="rounded-lg border border-border divide-y divide-border">
          {pinned.map((post) => (
            <div key={post.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="text-[10px] text-muted-foreground w-16 shrink-0">
                {post.platform}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">
                  {post.caption || <span className="text-muted-foreground italic">no caption</span>}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  @{post.creatorName} · {fmtNum(post.latestEngagement.views)} views
                </div>
              </div>
              <button
                onClick={() => onChange(pinnedIds.filter((x) => x !== post.id))}
                className="shrink-0 text-muted-foreground hover:text-destructive"
                title="Unpin post"
                aria-label="Unpin post"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
          {pinned.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No posts pinned. Add some from the archive.
            </div>
          )}
        </div>
      </section>

      {/* Add from archive */}
      <section>
        <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
          Add from archive
        </h2>
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 mb-2">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search posts by caption or creator"
            className="bg-transparent outline-none text-sm w-full placeholder:text-muted-foreground"
          />
        </div>
        <div className="rounded-lg border border-border divide-y divide-border max-h-[28rem] overflow-y-auto">
          {candidates.map((post) => (
            <div key={post.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="text-[10px] text-muted-foreground w-16 shrink-0">
                {post.platform}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">
                  {post.caption || <span className="text-muted-foreground italic">no caption</span>}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  @{post.creatorName} · {fmtDate(post.capturedAt)}
                </div>
              </div>
              <button
                onClick={() => onChange([post.id, ...pinnedIds])}
                className="shrink-0 inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] text-foreground hover:bg-accent"
              >
                <Plus className="size-3" /> Pin
              </button>
            </div>
          ))}
          {candidates.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {needle ? "No matching posts." : "Everything is already pinned."}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ---------------- shared ---------------- */

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatInterval(min: number) {
  if (min < 60) return `${min}m`;
  if (min < 60 * 24) return `${Math.round(min / 60)}h`;
  return `${Math.round(min / (60 * 24))}d`;
}
