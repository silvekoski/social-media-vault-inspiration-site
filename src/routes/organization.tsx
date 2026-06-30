import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { organizations, type OrgRole, type MemberStatus } from "../lib/mock-orgs";
import { useCurrentOrgId, setCurrentOrgId } from "../lib/current-org";
import { fmtDate, fmtNum } from "../lib/date";

export const Route = createFileRoute("/organization")({
  head: () => ({
    meta: [
      { title: "Organization, Vault" },
      { name: "description", content: "Manage your organization, members, plan, and usage." },
    ],
  }),
  component: OrganizationPage,
});

type Tab = "overview" | "members" | "billing" | "workspaces";

function OrganizationPage() {
  const orgId = useCurrentOrgId();
  const [tab, setTab] = useState<Tab>("overview");
  const org = useMemo(() => organizations.find((o) => o.id === orgId) ?? organizations[0], [orgId]);

  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <header className="flex items-end justify-between mb-10">
        <div>
          <div className="text-xs text-muted-foreground mb-1">Organization</div>
          <h1 className="text-2xl font-semibold">{org.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {org.slug} · {org.plan} plan · {org.region} · created {fmtDate(org.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={orgId}
            onChange={(e) => setCurrentOrgId(e.target.value)}
            className="bg-transparent border border-border rounded-lg px-3 py-2 text-sm outline-none"
          >
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <button className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background text-sm font-medium px-3 py-2 hover:bg-foreground/90">
            New organization
          </button>
        </div>
      </header>

      <div className="grid grid-cols-5 gap-8 mb-10 text-sm">
        <Stat label="Members" value={`${org.seats.used} / ${org.seats.total}`} />
        <Stat label="Projects" value={String(org.projects)} />
        <Stat label="Tracked creators" value={fmtNum(org.creators)} />
        <Stat label="Storage" value={`${fmtNum(org.storage.usedGb)} / ${fmtNum(org.storage.totalGb)} GB`} />
        <Stat label="Captures this month" value={`${fmtNum(org.monthlyCaptures.used)} / ${fmtNum(org.monthlyCaptures.total)}`} />
      </div>

      <div className="flex items-center gap-1 text-xs mb-6">
        {(["overview", "members", "billing", "workspaces"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "px-3 py-1.5 rounded-lg capitalize " +
              (tab === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")
            }
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && <Overview org={org} />}
      {tab === "members" && <Members org={org} />}
      {tab === "billing" && <Billing org={org} />}
      {tab === "workspaces" && <Workspaces />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function Overview({ org }: { org: typeof organizations[number] }) {
  const usagePct = Math.round((org.monthlyCaptures.used / org.monthlyCaptures.total) * 100);
  const storagePct = Math.round((org.storage.usedGb / org.storage.totalGb) * 100);
  const seatPct = Math.round((org.seats.used / org.seats.total) * 100);

  return (
    <div className="grid grid-cols-2 gap-12">
      <section>
        <h2 className="text-sm font-medium mb-4">Quota usage</h2>
        <div className="space-y-4">
          <Bar label="Captures" used={org.monthlyCaptures.used} total={org.monthlyCaptures.total} pct={usagePct} suffix="this month" />
          <Bar label="Storage" used={org.storage.usedGb} total={org.storage.totalGb} pct={storagePct} suffix="GB" />
          <Bar label="Seats" used={org.seats.used} total={org.seats.total} pct={seatPct} suffix="filled" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium mb-4">Identity</h2>
        <dl className="text-sm space-y-2">
          <Row k="Organization ID" v={org.id} />
          <Row k="Slug" v={org.slug} />
          <Row k="Region" v={org.region} />
          <Row k="Plan" v={org.plan} />
          <Row k="Created" v={fmtDate(org.createdAt)} />
        </dl>
      </section>
    </div>
  );
}

function Bar({ label, used, total, pct, suffix }: { label: string; used: number; total: number; pct: number; suffix: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {fmtNum(used)} / {fmtNum(total)} {suffix}
        </span>
      </div>
      <div className="h-1 bg-muted rounded-sm overflow-hidden">
        <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="tabular-nums">{v}</dd>
    </div>
  );
}

function Members({ org }: { org: typeof organizations[number] }) {
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<OrgRole | "all">("all");

  const filtered = org.members.filter((m) => {
    if (roleFilter !== "all" && m.role !== roleFilter) return false;
    if (!q) return true;
    const n = q.toLowerCase();
    return m.name.toLowerCase().includes(n) || m.email.toLowerCase().includes(n);
  });

  return (
    <div>
      <div className="flex items-center gap-4 pb-3 mb-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by name or email..."
          className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted-foreground"
        />
        <div className="flex items-center gap-1 text-xs">
          {(["all", "owner", "admin", "operator", "viewer"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={
                "px-2 py-1 rounded-lg " +
                (roleFilter === r ? "bg-foreground text-background" : "text-muted-foreground")
              }
            >
              {r}
            </button>
          ))}
        </div>
        <button className="rounded-lg bg-foreground text-background text-xs font-medium px-3 py-1.5">
          Invite member
        </button>
      </div>

      <div className="grid grid-cols-12 gap-4 py-2 text-[10px] text-muted-foreground">
        <div className="col-span-4">Member</div>
        <div className="col-span-2">Role</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Joined</div>
        <div className="col-span-2 text-right">Last active</div>
      </div>

      {filtered.map((m) => (
        <div key={m.id} className="grid grid-cols-12 gap-4 py-3 items-center text-sm">
          <div className="col-span-4">
            <div className="font-medium">{m.name}</div>
            <div className="text-xs text-muted-foreground">{m.email}</div>
          </div>
          <div className="col-span-2 capitalize">{m.role}</div>
          <div className="col-span-2"><StatusLabel status={m.status} /></div>
          <div className="col-span-2 text-xs text-muted-foreground">{fmtDate(m.joinedAt)}</div>
          <div className="col-span-2 text-xs text-muted-foreground text-right">
            {m.lastActiveAt ? fmtDate(m.lastActiveAt) : "—"}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="py-16 text-center text-sm text-muted-foreground">No members match.</div>
      )}
    </div>
  );
}

function StatusLabel({ status }: { status: MemberStatus }) {
  const label = status === "active" ? "Active" : status === "invited" ? "Invite pending" : "Suspended";
  return <span className="text-xs text-muted-foreground">{label}</span>;
}

function Billing({ org }: { org: typeof organizations[number] }) {
  return (
    <div className="grid grid-cols-2 gap-12">
      <section>
        <h2 className="text-sm font-medium mb-4">Plan</h2>
        <dl className="text-sm space-y-2">
          <Row k="Current plan" v={org.plan} />
          <Row k="Billing cycle" v="Monthly" />
          <Row k="Next invoice" v="Jul 12, 2026" />
          <Row k="Amount" v={org.plan === "enterprise" ? "Custom" : org.plan === "business" ? "$499.00" : org.plan === "team" ? "$99.00" : "$0.00"} />
          <Row k="Payment method" v="Visa ending 4242" />
        </dl>
        <div className="flex gap-2 mt-6">
          <button className="rounded-lg bg-foreground text-background text-xs font-medium px-3 py-1.5">Change plan</button>
          <button className="rounded-lg border border-border text-xs font-medium px-3 py-1.5">Update card</button>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium mb-4">Recent invoices</h2>
        <div className="text-sm">
          {[
            { id: "INV-2026-06", date: "Jun 12, 2026", amount: "$499.00", status: "Paid" },
            { id: "INV-2026-05", date: "May 12, 2026", amount: "$499.00", status: "Paid" },
            { id: "INV-2026-04", date: "Apr 12, 2026", amount: "$499.00", status: "Paid" },
            { id: "INV-2026-03", date: "Mar 12, 2026", amount: "$499.00", status: "Paid" },
          ].map((inv) => (
            <div key={inv.id} className="grid grid-cols-4 gap-2 py-2 items-center">
              <div className="text-xs">{inv.id}</div>
              <div className="text-xs text-muted-foreground">{inv.date}</div>
              <div className="text-xs tabular-nums">{inv.amount}</div>
              <div className="text-xs text-muted-foreground text-right">{inv.status}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Workspaces() {
  const items = [
    { name: "Default", projects: 8, members: 7, env: "production" },
    { name: "Research sandbox", projects: 3, members: 4, env: "staging" },
    { name: "Client deliverables", projects: 1, members: 2, env: "production" },
  ];
  return (
    <div>
      <div className="grid grid-cols-12 gap-4 py-2 text-[10px] text-muted-foreground">
        <div className="col-span-5">Workspace</div>
        <div className="col-span-2">Environment</div>
        <div className="col-span-2">Projects</div>
        <div className="col-span-2">Members</div>
        <div className="col-span-1 text-right"></div>
      </div>
      {items.map((w) => (
        <div key={w.name} className="grid grid-cols-12 gap-4 py-3 items-center text-sm">
          <div className="col-span-5 font-medium">{w.name}</div>
          <div className="col-span-2 text-xs text-muted-foreground capitalize">{w.env}</div>
          <div className="col-span-2 tabular-nums">{w.projects}</div>
          <div className="col-span-2 tabular-nums">{w.members}</div>
          <div className="col-span-1 text-right text-xs text-muted-foreground">Open</div>
        </div>
      ))}
    </div>
  );
}
