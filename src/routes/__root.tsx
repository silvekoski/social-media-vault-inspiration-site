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
import { useEffect, useRef, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
// Also import as a side-effect so Vite injects the styles on the client even
// when the <link> stylesheet request is served with a JS MIME type by a proxy.
import "../styles.css";
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

type NavLink = { to: string; label: string };
type NavSection = { heading: string | null; items: NavLink[] };

const navSections: NavSection[] = [
  {
    heading: null,
    items: [
      { to: "/", label: "Overview" },
      { to: "/projects", label: "Projects" },
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
  {
    heading: "Project",
    items: [
      { to: "/runs", label: "Runs" },
      { to: "/targets", label: "Scrape Targets" },
      { to: "/archive", label: "Browse Data" },
    ],
  },
];

function GlobalCaptureBar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background">
      <div className="flex items-center h-16 px-4 gap-4">
        <div className="w-60 shrink-0 flex items-center gap-2">
          <div className="size-8 rounded-lg bg-foreground shrink-0 flex items-center justify-center" aria-label="Vault logo">
            <span className="text-[10px] font-semibold text-background">V</span>
          </div>
          <span className="text-sm font-semibold text-foreground">Vault</span>
        </div>
        <div className="flex-1 max-w-2xl mx-auto">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Paste TikTok or Instagram URL to archive"
              className="bg-transparent border-none outline-none w-full text-sm placeholder:text-muted-foreground"
            />
            <div className="flex items-center gap-1 shrink-0 text-[10px] text-muted-foreground">
              <kbd className="rounded border border-border px-1 py-px">⌘</kbd>
              <kbd className="rounded border border-border px-1 py-px">K</kbd>
            </div>
          </div>
        </div>
        <div className="w-60 shrink-0 flex items-center justify-end gap-4 text-sm">
          <ProfileMenu />
        </div>
      </div>
    </div>
  );
}

const currentUser = {
  name: "Veikka Silvekoski",
  email: "veikka@vault.app",
  initials: "VS",
};

function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open account menu"
        className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {currentUser.initials}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 rounded border border-border bg-background py-1"
        >
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
              {currentUser.initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{currentUser.name}</p>
              <p className="truncate text-xs text-muted-foreground">{currentUser.email}</p>
            </div>
          </div>

          <div className="my-1 border-t border-border" />

          <Link
            to="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Organization
          </Link>
          <Link
            to="/account"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Account
          </Link>

          <div className="my-1 border-t border-border" />

          <button
            type="button"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

function WorkspaceSwitcher() {
  const currentOrg = useCurrentOrg();
  const projects = useProjectsForOrg();
  const currentProjectId = useCurrentProjectId();

  return (
    <div className="mb-6 space-y-1.5">
      <div className="relative inline-flex w-full items-center">
        <select
          value={currentOrg.id}
          onChange={(e) => setCurrentOrgId(e.target.value)}
          className="w-full appearance-none rounded-md border border-border bg-transparent pl-2.5 pr-8 py-1.5 text-sm font-medium text-foreground outline-none hover:bg-accent/50 cursor-pointer"
          aria-label="Switch organization"
        >
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <ChevronDown className="size-3.5 absolute right-2.5 pointer-events-none text-muted-foreground" />
      </div>
      <div className="relative inline-flex w-full items-center">
        <select
          value={currentProjectId}
          onChange={(e) => setCurrentProjectId(currentOrg.id, e.target.value)}
          className="w-full appearance-none rounded-md border border-border bg-transparent pl-2.5 pr-8 py-1.5 text-xs text-muted-foreground outline-none hover:bg-accent/50 cursor-pointer"
          aria-label="Switch project"
        >
          <option value="all">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <ChevronDown className="size-3.5 absolute right-2.5 pointer-events-none text-muted-foreground" />
      </div>
    </div>
  );
}

function Sidebar() {
  const currentPath = useRouterState({
    select: (s) => s.location.pathname,
  });

  const isLinkActive = (to: string) =>
    currentPath === to || (to !== "/" && currentPath.startsWith(to + "/"));

  return (
    <aside className="w-64 border-r border-border flex flex-col shrink-0 h-[calc(100vh-4rem)] overflow-hidden">
      <div className="p-4">
        <WorkspaceSwitcher />
        <nav className="space-y-6">
          {navSections.map((section, sectionIndex) => (
            <div key={section.heading ?? `section-${sectionIndex}`} className="space-y-1">
              {section.heading && (
                <h2 className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                  {section.heading}
                </h2>
              )}
              {section.items.map((item) => {
                const active = isLinkActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={
                      "flex items-center rounded-md px-3 py-2 text-sm " +
                      (active
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground")
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
