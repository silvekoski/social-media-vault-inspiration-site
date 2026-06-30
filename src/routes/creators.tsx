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

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-black/5">
              <th className="px-4 py-2 font-medium text-muted-foreground"></th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Platform</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Username</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Display Name</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Followers</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Posts</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Watched</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Active</th>
              <th className="px-4 py-2 font-medium text-muted-foreground">Discovered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {creators.map((c) => (
              <tr key={c.id} className="">
                <td className="pl-4 pr-0 py-2">
                  <img
                    src={`https://picsum.photos/seed/${c.username}/64/64?grayscale`}
                    alt=""
                    className="h-8 w-8 object-cover bg-muted rounded-lg"
                    loading="lazy"
                  />
                </td>
                <td className="px-4 py-2">
                  <span className="text-[10px] text-muted-foreground">
                    {c.platform}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs">@{c.username}</td>
                <td className="px-4 py-2">{c.displayName}</td>
                <td className="px-4 py-2 text-xs">{fmtNumber(c.followers)}</td>
                <td className="px-4 py-2 text-xs">{c.postCount}</td>
                <td className="px-4 py-2">
                  {c.watched ? "Yes" : "No"}
                </td>
                <td className="px-4 py-2">
                  {c.active ? "Yes" : "No"}
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{c.discoveredVia}</td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>
    </section>
  );
}

function fmtNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}