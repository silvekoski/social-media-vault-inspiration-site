import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Search, ChevronDown } from "lucide-react";
import { organizations } from "../lib/mock-orgs";
import { useCurrentOrg, setCurrentOrgId } from "../lib/current-org";
import { useProjectsForOrg, useCurrentProjectId, setCurrentProjectId } from "../lib/current-project";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Vault, Social Archive" },
      { name: "description", content: "Operator panel for social media archive service" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
    ],

  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const navGroups = [
  {
    heading: null,
    items: [
      { to: "/", label: "Overview" },
      { to: "/projects", label: "Projects" },
    ],
  },
  {
    heading: "Project",
    items: [
      { to: "/runs", label: "Runs" },
      { to: "/creators", label: "Creators" },
      { to: "/archive", label: "Browse Data" },
    ],
  },
  {
    heading: "Organization",
    items: [
      { to: "/media-specs", label: "Media Specs" },
      { to: "/scrapers", label: "Scrapers" },
      { to: "/prompts", label: "Prompts" },
    ],
  },
];

function GlobalCaptureBar() {
  const currentPath = useRouterState({
    select: (s) => s.location.pathname,
  });
  const currentOrg = useCurrentOrg();
  const projects = useProjectsForOrg();
  const currentProjectId = useCurrentProjectId();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background">
      <div className="flex items-center h-16 px-4 gap-4">
        <div className="shrink-0 flex items-center gap-3">
          <div className="w-20 h-9 rounded-lg bg-muted shrink-0 flex items-center justify-center" aria-label="Logo">
            <span className="text-xs font-medium text-muted-foreground">VAULT</span>
          </div>
          <div className="relative inline-flex items-center">
            <select
              value={currentOrg.id}
              onChange={(e) => setCurrentOrgId(e.target.value)}
              className="appearance-none bg-transparent border border-border rounded-lg pl-3 pr-8 py-1.5 text-sm outline-none hover:bg-muted/40 cursor-pointer"
              aria-label="Switch organization"
            >
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            <ChevronDown className="size-3.5 absolute right-2 pointer-events-none text-muted-foreground" />
          </div>
          <span className="text-muted-foreground text-sm">/</span>
          <div className="relative inline-flex items-center">
            <select
              value={currentProjectId}
              onChange={(e) => setCurrentProjectId(currentOrg.id, e.target.value)}
              className="appearance-none bg-transparent border border-border rounded-lg pl-3 pr-8 py-1.5 text-sm outline-none hover:bg-muted/40 cursor-pointer max-w-[200px] truncate"
              aria-label="Switch project"
            >
              <option value="all">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown className="size-3.5 absolute right-2 pointer-events-none text-muted-foreground" />
          </div>
        </div>
        <div className="flex-1 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Search className="size-4 text-foreground shrink-0" />
            <input
              type="text"
              placeholder="Paste TikTok or Instagram URL to archive"
              className="bg-transparent border-none outline-none w-full text-sm placeholder:text-muted-foreground"
            />
            <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-muted-foreground">
              <span>CMD</span>
              <span>K</span>
            </div>
          </div>
        </div>
        <div className="w-48 shrink-0 flex items-center justify-end gap-4 text-sm">
          <Link
            to="/settings"
            className={
              currentPath === "/settings" || currentPath.startsWith("/settings/")
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }
          >
            Settings
          </Link>
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  const currentPath = useRouterState({
    select: (s) => s.location.pathname,
  });

  return (
    <aside className="w-64 border-r border-border flex flex-col shrink-0 h-[calc(100vh-4rem)] overflow-hidden">
      <div className="p-6">
        <div className="mb-8">
          <span className="text-xs font-semibold text-foreground">
            Vault-01
          </span>
        </div>
        <nav className="space-y-6">
          {navGroups.map((group, groupIndex) => (
            <div key={group.heading ?? `group-${groupIndex}`} className="space-y-1">
              {group.heading && (
                <h2 className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group.heading}
                </h2>
              )}
              {group.items.map((item) => {
                const isActive = currentPath === item.to || currentPath.startsWith(item.to + "/");
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={
                      "block px-3 py-2 text-sm " +
                      (isActive
                        ? "text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const currentOrg = useCurrentOrg();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground font-sans selection:bg-foreground/30">
        <GlobalCaptureBar />
        <div className="flex pt-16 h-screen overflow-hidden">
          <Sidebar />
          <main key={currentOrg.id} className="flex-1 h-[calc(100vh-4rem)] overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </QueryClientProvider>
  );
}
