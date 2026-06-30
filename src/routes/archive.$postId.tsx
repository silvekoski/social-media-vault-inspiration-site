import { createFileRoute } from "@tanstack/react-router";
import { archivePostById } from "../lib/mock-archive";
import { fmtDate } from "../lib/date";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/archive/$postId")({
  head: () => ({
    meta: [
      { title: "Post Detail, Vault" },
      { name: "description", content: "Archived post detail view" },
    ],
  }),
  component: PostDetailPage,
});

function PostDetailPage() {
  const { postId } = Route.useParams();
  const post = archivePostById.get(postId);

  if (!post) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Post not found
      </div>
    );
  }

  const chartData = post.engagementHistory.map((e) => ({
    date: fmtDate(e.capturedAt),
    likes: e.likes,
    views: e.views,
    comments: e.comments,
    shares: e.shares,
  }));

  return (
    <section className="py-10">
      <div className="max-w-6xl mx-auto px-10">
        <Link to="/archive" className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <ArrowLeft className="size-4" />
          Back to archive
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <span className="text-[10px] text-muted-foreground">
            {post.platform}
          </span>
          <span className="text-xs text-muted-foreground">ID: {post.platformPostId}</span>
          <span className="text-xs text-muted-foreground">@{post.creatorName}</span>
          {post.extractionStatus !== "ok" && (
            <span className="text-[10px] text-muted-foreground">
              {post.extractionStatus}
            </span>
          )}
        </div>

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-5 space-y-6">
            <div className="w-full aspect-[9/16] rounded-sm bg-muted flex items-center justify-center overflow-hidden border border-black/5">
              {post.postType === "video" || post.postType === "reel" ? (
                <span className="text-[10px] text-muted-foreground">Video</span>
              ) : (
                <span className="text-[10px] text-muted-foreground">Image</span>
              )}
            </div>

            <div>
              <h3 className="text-xs text-muted-foreground mb-3">Caption</h3>
              <p className="text-sm text-foreground leading-relaxed">{post.caption}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {post.hashtags.map((tag) => (
                  <span key={tag} className="text-[10px] text-foreground">#{tag}</span>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs text-muted-foreground mb-3">Engagement</h3>
              <div className="grid grid-cols-2 gap-4">
                <Metric label="Likes" value={post.latestEngagement.likes.toLocaleString()} />
                <Metric label="Views" value={post.latestEngagement.views.toLocaleString()} />
                <Metric label="Shares" value={post.latestEngagement.shares.toLocaleString()} />
                <Metric label="Comments" value={post.latestEngagement.comments.toLocaleString()} />
                <Metric label="Saves" value={post.latestEngagement.saves.toLocaleString()} />
              </div>
            </div>
          </div>

          <div className="col-span-7 space-y-6">
            <div>
              <h3 className="text-xs text-muted-foreground mb-3">Engagement History</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={{ stroke: "#e5e5e5" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#a3a3a3" }} axisLine={{ stroke: "#e5e5e5" }} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e5e5e5", borderRadius: "8px", fontSize: "12px" }}
                      itemStyle={{ color: "#000000" }}
                    />
                    <Line type="monotone" dataKey="likes" stroke="#000000" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="views" stroke="#737373" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="comments" stroke="#a3a3a3" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h3 className="text-xs text-muted-foreground mb-3">Revision History</h3>
              <div className="space-y-3">
                {post.revisions.map((rev) => (
                  <div key={rev.id} className="pb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-foreground">v{rev.version}</span>
                      <span className="text-[10px] text-muted-foreground">{fmtDate(rev.detectedAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{rev.caption}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {rev.hashtags.map((tag) => (
                        <span key={tag} className="text-[9px] text-foreground/70">#{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {post.analyses.length > 0 && (
              <div>
                <h3 className="text-xs text-muted-foreground mb-3">AI Analyses</h3>
                <div className="space-y-3">
                  {post.analyses.map((a) => (
                    <div key={a.id} className="pb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground">{a.promptName}</span>
                        <span className="text-[10px] text-muted-foreground">{a.provider} / {a.model}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{a.output}</p>
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        Cost: ${a.costEstimate.toFixed(2)} {a.completedAt && ", " + fmtDate(a.completedAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-medium text-foreground mt-0.5">{value}</div>
    </div>
  );
}