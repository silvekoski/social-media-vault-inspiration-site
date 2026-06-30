import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useScopedArchive, useScopedRoster } from "../lib/org-scope";
import { fmtDateShort, fmtNum } from "../lib/date";
import {
  Search,
  Film,
  Image as ImageIcon,
  Images,
  X,
  ChevronDown,
} from "lucide-react";

export const Route = createFileRoute("/archive")({
  head: () => ({
    meta: [
      { title: "Archive , Vault" },
      { name: "description", content: "Browse archived posts" },
    ],
  }),
  component: ArchivePage,
});

type SortKey = "recent" | "oldest" | "views" | "likes" | "comments";
type PlatformFilter = "all" | "tiktok" | "instagram" | "youtube";
type TypeFilter = "all" | "video" | "reel" | "photo" | "carousel" | "short" | "long";

function compactNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(n >= 10_000 ? 0 : 1) + "K";
  return String(n);
}

function ArchivePage() {
  const archivePosts = useScopedArchive();
  const allCreators = useScopedRoster();
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [sort, setSort] = useState<SortKey>("recent");
  const [selectedCreators, setSelectedCreators] = useState<Set<string>>(new Set());
  const [creatorQuery, setCreatorQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qTokens = q ? q.split(/\s+/).filter(Boolean) : [];
    const out: typeof archivePosts = [];
    for (let i = 0; i < archivePosts.length; i++) {
      const p = archivePosts[i]!;
      if (platform !== "all" && p.platform !== platform) continue;
      if (type !== "all") {
        if (type === "video" && p.postType !== "video" && p.postType !== "reel") continue;
        if (type !== "video" && p.postType !== type) continue;
      }
      if (selectedCreators.size > 0 && !selectedCreators.has(p.creatorId)) continue;
      if (qTokens.length > 0) {
        const hay =
          p.caption.toLowerCase() +
          " " +
          p.creatorName.toLowerCase() +
          " " +
          p.hashtags.join(" ");
        let ok = true;
        for (const t of qTokens) {
          if (!hay.includes(t)) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
      }
      out.push(p);
    }
    switch (sort) {
      case "recent":
        out.sort((a, b) => (a.capturedAt < b.capturedAt ? 1 : -1));
        break;
      case "oldest":
        out.sort((a, b) => (a.capturedAt > b.capturedAt ? 1 : -1));
        break;
      case "views":
        out.sort((a, b) => b.latestEngagement.views - a.latestEngagement.views);
        break;
      case "likes":
        out.sort((a, b) => b.latestEngagement.likes - a.latestEngagement.likes);
        break;
      case "comments":
        out.sort((a, b) => b.latestEngagement.comments - a.latestEngagement.comments);
        break;
    }
    return out;
  }, [query, platform, type, sort, selectedCreators]);

  const creatorOptions = useMemo(() => {
    const cq = creatorQuery.trim().toLowerCase();
    const arr = cq
      ? allCreators.filter(
          (c) =>
            c.username.toLowerCase().includes(cq) ||
            c.displayName.toLowerCase().includes(cq),
        )
      : allCreators;
    return [...arr].sort((a, b) => a.username.localeCompare(b.username));
  }, [creatorQuery]);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => scrollerRef.current,
    estimateSize: () => 64,
    overscan: 12,
  });

  function toggleCreator(id: string) {
    setSelectedCreators((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearAll() {
    setQuery("");
    setPlatform("all");
    setType("all");
    setSort("recent");
    setSelectedCreators(new Set());
  }

  const activeFilterCount =
    (platform !== "all" ? 1 : 0) +
    (type !== "all" ? 1 : 0) +
    (selectedCreators.size > 0 ? 1 : 0) +
    (query.trim() ? 1 : 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="px-6 pt-6 pb-4">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Archive</h1>
            <p className="text-xs text-muted-foreground mt-1">
              {fmtNum(filtered.length)} of{" "}
              {fmtNum(archivePosts.length)} posts
              {activeFilterCount > 0 && (
                <>
                  <span className="mx-2 text-muted-foreground">|</span>
                  <button
                    onClick={clearAll}
                    className="text-foreground"
                  >
                    clear {activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""}
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-md border-b border-black/10 focus-within:border-foreground/60">
            <Search className="size-3.5 text-muted-foreground shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search captions, creators, hashtags…"
              className="bg-transparent outline-none w-full text-sm py-2 placeholder:text-muted-foreground"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-muted-foreground"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <SegGroup
            value={platform}
            onChange={(v) => setPlatform(v as PlatformFilter)}
            options={[
              { v: "all", l: "All" },
              { v: "tiktok", l: "TikTok" },
              { v: "instagram", l: "Instagram" },
              { v: "youtube", l: "YouTube" },
            ]}
          />

          <SegGroup
            value={type}
            onChange={(v) => setType(v as TypeFilter)}
            options={[
              { v: "all", l: "Any" },
              { v: "video", l: "Video" },
              { v: "photo", l: "Photo" },
              { v: "carousel", l: "Carousel" },
              { v: "short", l: "Short" },
              { v: "long", l: "Long" },
            ]}
          />

          <CreatorPicker
            options={creatorOptions}
            selected={selectedCreators}
            onToggle={toggleCreator}
            onClear={() => setSelectedCreators(new Set())}
            query={creatorQuery}
            setQuery={setCreatorQuery}
          />

          <div className="ml-auto flex items-center gap-2">
            <label className="text-[10px] text-muted-foreground">
              Sort
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="bg-transparent border border-black/10 rounded-lg text-xs px-2 py-1.5 text-foreground focus:outline-none focus:border-foreground/60"
            >
              <option value="recent">Most recent</option>
              <option value="oldest">Oldest</option>
              <option value="views">Top views</option>
              <option value="likes">Top likes</option>
              <option value="comments">Top comments</option>
            </select>
          </div>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[24px_120px_minmax(0,1fr)_repeat(3,72px)_88px] gap-3 mt-4 pb-2 text-[10px] text-muted-foreground">
          <div></div>
          <div>Creator</div>
          <div>Caption</div>
          <div className="text-right">Views</div>
          <div className="text-right">Likes</div>
          <div className="text-right">Comments</div>
          <div className="text-right">Captured</div>
        </div>
      </header>

      {/* Virtualized list */}
      <div ref={scrollerRef} className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="py-20 text-center text-sm text-muted-foreground">
            No posts match the current filters.
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((vi) => {
              const post = filtered[vi.index]!;
              return (
                <Link
                  key={post.id}
                  to="/archive/$postId"
                  params={{ postId: post.id }}
                  className="grid grid-cols-[24px_120px_minmax(0,1fr)_repeat(3,72px)_88px] gap-3 items-center px-6 border-b border-white/[0.04] hover:bg-white/[0.025]"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: `${vi.size}px`,
                    transform: `translateY(${vi.start}px)`,
                  }}
                >
                  <TypeIcon type={post.postType} />
                  <div className="min-w-0">
                    <div className="text-xs text-foreground truncate">
                      @{post.creatorName}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {post.platform}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm text-muted-foreground truncate">
                      {post.caption}
                    </div>
                    {post.extractionStatus !== "ok" && (
                      <div className="text-[10px] text-muted-foreground/80">
                        extraction: {post.extractionStatus}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs text-muted-foreground tabular-nums">
                    {compactNumber(post.latestEngagement.views)}
                  </div>
                  <div className="text-right text-xs text-muted-foreground tabular-nums">
                    {compactNumber(post.latestEngagement.likes)}
                  </div>
                  <div className="text-right text-xs text-muted-foreground tabular-nums">
                    {compactNumber(post.latestEngagement.comments)}
                  </div>
                  <div className="text-right text-[10px] text-muted-foreground">
                    {fmtDateShort(post.capturedAt)}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SegGroup({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ v: string; l: string }>;
}) {
  return (
    <div className="inline-flex border border-black/10 rounded-lg overflow-hidden">
      {options.map((o, i) => {
        const active = o.v === value;
        return (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={
              "px-2.5 py-1.5 text-xs " +
              (i > 0 ? "border-l border-black/10 " : "") +
              (active
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground hover:bg-black/[0.03]")
            }
          >
            {o.l}
          </button>
        );
      })}
    </div>

  );
}

function CreatorPicker({
  options,
  selected,
  onToggle,
  onClear,
  query,
  setQuery,
}: {
  options: ReturnType<typeof useScopedRoster>;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
  query: string;
  setQuery: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={
          "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-black/10 rounded-lg " +
          (selected.size > 0
            ? "bg-foreground/10 text-foreground"
            : "text-muted-foreground ")
        }
      >
        Creators
        {selected.size > 0 && (
          <span className="text-[10px]">({selected.size})</span>
        )}
        <ChevronDown className="size-3" />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute z-40 mt-1 w-72 bg-white border border-black/10 rounded-lg shadow-xl overflow-hidden">
            <div className="p-2 border-b border-black/5">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find creator…"
                className="w-full bg-transparent text-xs outline-none placeholder:text-muted-foreground px-1 py-1"
                autoFocus
              />
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
              {options.map((c) => {
                const isSel = selected.has(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => onToggle(c.id)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-black/[0.04]"
                  >
                    <span
                      className={
                        "size-3 rounded-sm border " +
                        (isSel
                          ? "bg-primary border-foreground"
                          : "border-black/20")
                      }
                    />
                    <span className="text-xs text-foreground truncate flex-1">
                      @{c.username}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {c.platform}
                    </span>
                  </button>
                );
              })}
              {options.length === 0 && (
                <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                  No creators
                </div>
              )}
            </div>
            {selected.size > 0 && (
              <div className="p-2 border-t border-black/5 flex justify-between text-[10px]">
                <span className="text-muted-foreground">{selected.size} selected</span>
                <button
                  onClick={onClear}
                  className="text-foreground"
                >
                  clear
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TypeIcon({ type }: { type: string }) {
  if (type === "carousel")
    return <Images className="size-3.5 text-muted-foreground" />;
  if (type === "video" || type === "reel")
    return <Film className="size-3.5 text-muted-foreground" />;
  return <ImageIcon className="size-3.5 text-muted-foreground" />;
}