import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentOrg } from "@/lib/current-org";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings , Vault" },
      { name: "description", content: "Vault configuration" },
    ],
  }),
  component: SettingsPage,
});

type Scope = "organization" | "workspace";

function SettingsPage() {
  const [scope, setScope] = useState<Scope>("organization");
  const org = useCurrentOrg();

  return (
    <section className="py-10">
      <div className="max-w-3xl mx-auto px-10">
        <h1 className="text-2xl font-semibold text-foreground mb-6">Settings</h1>

        <div className="flex gap-6 text-sm mb-8 border-b border-border">
          {([
            ["organization", `Organization · ${org.name}`],
            ["workspace", "Workspace"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setScope(key)}
              className={`pb-2 -mb-px border-b-2 ${
                scope === key
                  ? "border-foreground text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {scope === "organization" && <OrganizationSettings orgName={org.name} />}
        {scope === "workspace" && <WorkspaceSettings />}
      </div>
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-medium text-foreground mb-4">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({
  label,
  hint,
  control,
}: {
  label: string;
  hint?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1 gap-4">
      <div>
        <div className="text-sm text-foreground">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function OrganizationSettings({ orgName }: { orgName: string }) {
  return (
    <div className="space-y-10">
      <Section title="Identity">
        <div>
          <div className="text-sm text-foreground mb-1.5">Organization name</div>
          <Input defaultValue={orgName} className="text-sm" />
        </div>
        <div>
          <div className="text-sm text-foreground mb-1.5">Slug</div>
          <Input defaultValue={orgName.toLowerCase().replace(/\s+/g, "-")} className="text-sm" />
        </div>
        <div>
          <div className="text-sm text-foreground mb-1.5">Contact email</div>
          <Input type="email" defaultValue="ops@vault.local" className="text-sm" />
        </div>
      </Section>

      <Section title="Members & access">
        <Row
          label="Default member role"
          control={
            <Select defaultValue="viewer">
              <SelectTrigger className="w-[160px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          }
        />
        <Row label="Require 2FA for all members" control={<Switch defaultChecked />} />
        <Row
          label="SSO (SAML)"
          hint="Single sign-on for the org domain"
          control={<Switch />}
        />
        <Row
          label="Allowed email domains"
          control={<span className="text-sm text-muted-foreground">vault.local, partners.io</span>}
        />
      </Section>

      <Section title="Billing">
        <Row label="Plan" control={<span className="text-sm text-muted-foreground">Team · $99/mo</span>} />
        <Row label="Seats" control={<span className="text-sm text-muted-foreground">12 of 25</span>} />
        <div>
          <div className="text-sm text-foreground mb-1.5">Billing email</div>
          <Input type="email" defaultValue="billing@vault.local" className="text-sm" />
        </div>
        <div>
          <div className="text-sm text-foreground mb-1.5">Tax ID</div>
          <Input defaultValue="EU372000000" className="text-sm" />
        </div>
      </Section>

      <Section title="Quotas">
        <Row label="Monthly scrape budget" control={<span className="text-sm text-muted-foreground">$1,500</span>} />
        <Row label="Storage allowance" control={<span className="text-sm text-muted-foreground">5 TB</span>} />
        <Row label="AI tokens / month" control={<span className="text-sm text-muted-foreground">20M</span>} />
      </Section>

      <Section title="Audit & compliance">
        <Row label="Audit log retention" control={<span className="text-sm text-muted-foreground">365 days</span>} />
        <Row label="Export audit log" control={<button className="text-sm underline">Download CSV</button>} />
        <Row label="Data residency" control={<span className="text-sm text-muted-foreground">EU (Frankfurt)</span>} />
      </Section>

      <Section title="Danger zone">
        <Row
          label="Transfer ownership"
          control={<button className="text-sm underline">Transfer</button>}
        />
        <Row
          label="Delete organization"
          hint="Permanently removes all workspaces, projects, and archives"
          control={<button className="text-sm underline text-destructive">Delete</button>}
        />
      </Section>
    </div>
  );
}

function WorkspaceSettings() {
  return (
    <div className="space-y-10">
      <Section title="Discovery Schedule">
        <Row label="Enabled" hint="Automatically discover new posts" control={<Switch defaultChecked />} />
        <Row label="Interval" hint="How often to run discovery" control={<span className="text-sm text-muted-foreground">6 hours</span>} />
      </Section>

      <Section title="Engagement Re-poll">
        <Row label="Enabled" hint="Re-fetch engagement counts" control={<Switch defaultChecked />} />
        <Row label="Initial recheck delay" control={<span className="text-sm text-muted-foreground">7 days</span>} />
        <Row label="Recurring interval" control={<span className="text-sm text-muted-foreground">30 days</span>} />
        <Row label="Max age cutoff" control={<span className="text-sm text-muted-foreground">365 days</span>} />
      </Section>

      <Section title="Cost Caps">
        <Row label="Daily scraper cap (all providers)" control={<span className="text-sm text-muted-foreground">$50.00</span>} />
        <Row label="Per-provider cap · Apify" control={<span className="text-sm text-muted-foreground">$25.00</span>} />
        <Row label="Per-provider cap · Bright Data" control={<span className="text-sm text-muted-foreground">$15.00</span>} />
        <Row label="Per-provider cap · Floxy" control={<span className="text-sm text-muted-foreground">$10.00</span>} />
        <Row label="Daily Gemini cap" control={<span className="text-sm text-muted-foreground">$10.00</span>} />
        <Row label="Daily OpenAI cap" control={<span className="text-sm text-muted-foreground">$10.00</span>} />
      </Section>

      <div>
        <h2 className="text-sm font-medium text-foreground mb-2">API Keys</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Scraper providers are pluggable. Configure credentials per provider; routing and
          fallback live under <a href="/scrapers" className="underline">Scrapers</a>.
        </p>
        <div className="space-y-4">
          {[
            ["Apify API token", "apify_api_a1b2c3d4e5f6g7h8i9j0"],
            ["Bright Data API token", "brd_customer_hl_xxxxxxxx_zone_instagram"],
            ["Floxy API key", "flx_sk_live_xxxxxxxxxxxxxxxx"],
            ["TikTok session cookie", "sessionid=xxxxxxxxxxxxxxxxxxxxxxxx"],
            ["Gemini API key", "AIzaSyxxxxxxxxxxxxxxxx"],
            ["OpenAI API key", "sk-proj-xxxxxxxxxxxxxxxx"],
            ["OpenRouter API key", "sk-or-v1-xxxxxxxxxxxxxxxx"],
          ].map(([label, val]) => (
            <div key={label}>
              <div className="text-sm text-foreground mb-1.5">{label}</div>
              <Input type="password" defaultValue={val} className="text-sm" />
            </div>
          ))}
        </div>
      </div>

      <Section title="Capture Defaults">
        <Row label="Archive media" hint="Download videos and images" control={<Switch defaultChecked />} />
        <Row label="Archive captions" hint="Store caption text and hashtags" control={<Switch defaultChecked />} />
        <Row label="Media quality" control={<span className="text-sm text-muted-foreground">Highest available</span>} />
        <Row label="Default platforms" control={<span className="text-sm text-muted-foreground">TikTok, Instagram, YouTube</span>} />
      </Section>

      <div>
        <h2 className="text-sm font-medium text-foreground mb-4">Storage &amp; Retention</h2>
        <div className="space-y-4">
          <Row label="Storage limit" hint="Auto-pause when exceeded" control={<span className="text-sm text-muted-foreground">2 TB</span>} />
          <div className="px-1">
            <Slider defaultValue={[60]} max={100} step={1} className="w-48" />
          </div>
          <Row label="Auto-cleanup" hint="Remove posts older than retention" control={<Switch />} />
          <Row label="Retention period" control={<span className="text-sm text-muted-foreground">Unlimited</span>} />
          <Row label="Media compression" hint="Re-encode archived videos" control={<Switch />} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-foreground mb-4">Notifications</h2>
        <div className="space-y-4">
          <div>
            <div className="text-sm text-foreground mb-1.5">Webhook URL</div>
            <Input
              type="url"
              placeholder="https://hooks.example.com/vault"
              className="text-sm"
            />
          </div>
          <Row label="Run failure alerts" control={<Switch defaultChecked />} />
          <Row label="Cost overrun alerts" control={<Switch defaultChecked />} />
          <Row label="Storage limit alerts" control={<Switch defaultChecked />} />
          <Row label="Weekly digest" hint="Summary of runs and costs" control={<Switch />} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-foreground mb-4">AI Defaults</h2>
        <div className="space-y-4">
          <Row label="Auto-analyze new captures" hint="Run default prompt after capture" control={<Switch defaultChecked />} />
          <div>
            <div className="text-sm text-foreground mb-1.5">Default provider</div>
            <Select defaultValue="gemini">
              <SelectTrigger className="w-[200px] text-sm">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini">Gemini</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="openrouter">OpenRouter</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-sm text-foreground mb-1.5">Default model</div>
            <Select defaultValue="gemini-3.1-pro-preview">
              <SelectTrigger className="w-[260px] text-sm">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</SelectItem>
                <SelectItem value="gemini-3.1-flash">gemini-3.1-flash</SelectItem>
                <SelectItem value="gpt-5">gpt-5</SelectItem>
                <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                <SelectItem value="anthropic/claude-opus-4.5">claude-opus-4.5</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Row label="Analysis batch size" control={<span className="text-sm text-muted-foreground">10 posts</span>} />
        </div>
      </div>
    </div>
  );
}
