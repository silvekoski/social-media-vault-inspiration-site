import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account , Vault" },
      { name: "description", content: "Manage your personal account" },
    ],
  }),
  component: AccountPage,
});

const account = {
  name: "Veikka Silvekoski",
  email: "veikka@vault.app",
  handle: "veikka",
  initials: "VS",
};

function AccountPage() {
  return (
    <section className="py-10">
      <div className="max-w-3xl mx-auto px-10">
        <h1 className="text-2xl font-semibold text-foreground">Account</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile, login details, and personal preferences.
        </p>

        <div className="mt-8 divide-y divide-border [&>*]:py-10 first:[&>*]:pt-0 last:[&>*]:pb-0">
          <Section
            title="Your profile"
            description="This information is visible to other members of your organization."
          >
            <div className="flex items-center gap-4 py-1">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                {account.initials}
              </div>
              <div className="flex flex-col gap-2">
                <button type="button" className="text-sm underline text-foreground w-fit">
                  Upload photo
                </button>
                <p className="text-xs text-muted-foreground">
                  A photo is optional but recommended. PNG or JPG, at least 128px square.
                </p>
              </div>
            </div>

            <Field label="Display name">
              <Input defaultValue={account.name} className="text-sm" />
            </Field>
            <Field label="Handle" hint="Used in mentions across projects.">
              <Input defaultValue={account.handle} className="text-sm" />
            </Field>
            <Row label="Timezone" control={<span className="text-sm text-muted-foreground">UTC</span>} />
            <Row label="Time format" control={<span className="text-sm text-muted-foreground">24h</span>} />
          </Section>

          <Section
            title="Login details"
            description="Update the email and password used to sign in to your account."
          >
            <Field label="Email" hint="Primary email for sign-in and notifications.">
              <Input type="email" defaultValue={account.email} className="text-sm" />
            </Field>
            <Row
              label="Password"
              hint="Last changed 3 months ago."
              control={<button className="text-sm underline">Update password</button>}
            />
            <Row
              label="Two-factor authentication"
              hint="Authenticator app"
              control={<Switch defaultChecked />}
            />
            <Row
              label="Session timeout"
              hint="Sign out after inactivity"
              control={<span className="text-sm text-muted-foreground">30 days</span>}
            />
          </Section>

          <SsoSection />

          <Section
            title="Active sessions"
            description="Devices currently signed in to your account."
          >
            <Row
              label="This device"
              hint="Chrome on macOS · Helsinki · active now"
              control={<span className="text-sm text-muted-foreground">Current</span>}
            />
            <Row
              label="iPhone"
              hint="Safari on iOS · last active 2 days ago"
              control={<button className="text-sm underline">Revoke</button>}
            />
            <Row
              label="Sign out everywhere"
              hint="Ends all sessions except this one."
              control={<button className="text-sm underline">Sign out all</button>}
            />
          </Section>

          <Section
            title="Personal API tokens"
            description="Tokens authenticate the CLI and scripts as you."
          >
            <Field label="CLI token">
              <Input
                type="password"
                defaultValue="vlt_pat_user_a1b2c3d4e5f6"
                className="text-sm"
              />
            </Field>
            <Row
              label="Rotate token"
              hint="Revokes the current token and issues a new one."
              control={<button className="text-sm underline">Generate new</button>}
            />
          </Section>

          <Section
            title="Notifications"
            description="Choose how Vault contacts you."
          >
            <Row label="Email · run failures" control={<Switch defaultChecked />} />
            <Row label="Email · weekly digest" control={<Switch />} />
            <Row label="Email · mentions in projects" control={<Switch defaultChecked />} />
            <Row label="Browser push" control={<Switch />} />
          </Section>

          <Section
            title="Appearance"
            description="Personal display preferences for this account."
          >
            <Row
              label="Theme"
              control={
                <Select defaultValue="system">
                  <SelectTrigger className="w-[160px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              }
            />
            <Row label="Compact density" control={<Switch defaultChecked />} />
            <Row label="Reduce motion" control={<Switch />} />
          </Section>

          <Section title="Danger zone">
            <Row
              label="Delete account"
              hint="Removes your user and revokes all tokens. This cannot be undone."
              control={<button className="text-sm underline text-destructive">Delete</button>}
            />
          </Section>
        </div>
      </div>
    </section>
  );
}

type SsoProvider = {
  id: string;
  name: string;
  issuer: string;
  enabled: boolean;
};

const REDIRECT_URL = "https://app.vault.app/auth/sso/callback";

function SsoSection() {
  const [providers, setProviders] = useState<SsoProvider[]>([
    {
      id: "pocket-id",
      name: "Pocket ID",
      issuer: "https://id.example.com",
      enabled: true,
    },
  ]);
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    name: "",
    issuer: "",
    clientId: "",
    clientSecret: "",
  });

  const updateForm = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm({ name: "", issuer: "", clientId: "", clientSecret: "" });
    setAdding(false);
  };

  const canSave = form.name.trim() && form.issuer.trim() && form.clientId.trim();

  const handleSave = () => {
    if (!canSave) return;
    setProviders((prev) => [
      ...prev,
      {
        id: `${form.name.toLowerCase().replace(/\s+/g, "-")}-${prev.length}`,
        name: form.name.trim(),
        issuer: form.issuer.trim(),
        enabled: true,
      },
    ]);
    resetForm();
  };

  const toggleProvider = (id: string) =>
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)),
    );

  const removeProvider = (id: string) =>
    setProviders((prev) => prev.filter((p) => p.id !== id));

  const copyRedirect = async () => {
    try {
      await navigator.clipboard.writeText(REDIRECT_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Section
      title="Single sign-on (SSO)"
      description="Connect an OpenID Connect (OIDC) provider such as Pocket ID, Authentik, or Keycloak to sign in to Vault."
    >
      <Field
        label="Redirect URL"
        hint="Add this callback URL to your provider's allowed redirect URLs."
      >
        <div className="flex items-center gap-2">
          <Input readOnly value={REDIRECT_URL} className="text-sm" />
          <button
            type="button"
            onClick={copyRedirect}
            className="shrink-0 rounded border border-border px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </Field>

      <div className="space-y-1">
        {providers.length === 0 && (
          <p className="text-sm text-muted-foreground py-1">
            No identity providers connected yet.
          </p>
        )}
        {providers.map((p) => (
          <Row
            key={p.id}
            label={p.name}
            hint={`${p.issuer} · ${p.enabled ? "Enabled" : "Disabled"}`}
            control={
              <div className="flex items-center gap-4">
                <Switch
                  checked={p.enabled}
                  onCheckedChange={() => toggleProvider(p.id)}
                />
                <button
                  type="button"
                  onClick={() => removeProvider(p.id)}
                  className="text-sm underline text-destructive"
                >
                  Remove
                </button>
              </div>
            }
          />
        ))}
      </div>

      {adding ? (
        <div className="rounded border border-border p-4 space-y-4">
          <Field label="Display name" hint="Shown on the sign-in button.">
            <Input
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
              placeholder="Pocket ID"
              className="text-sm"
            />
          </Field>
          <Field
            label="Issuer URL"
            hint="The provider's OIDC discovery URL, e.g. https://id.example.com/.well-known/openid-configuration"
          >
            <Input
              value={form.issuer}
              onChange={(e) => updateForm("issuer", e.target.value)}
              placeholder="https://id.example.com"
              className="text-sm"
            />
          </Field>
          <Field label="Client ID">
            <Input
              value={form.clientId}
              onChange={(e) => updateForm("clientId", e.target.value)}
              placeholder="Paste your client ID"
              className="text-sm"
            />
          </Field>
          <Field label="Client secret" hint="Stored encrypted. Leave blank for public clients.">
            <Input
              type="password"
              value={form.clientSecret}
              onChange={(e) => updateForm("clientSecret", e.target.value)}
              placeholder="Paste your client secret"
              className="text-sm"
            />
          </Field>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="rounded border border-border px-3 py-2 text-sm text-foreground hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:hover:bg-transparent"
            >
              Save provider
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="text-sm underline text-muted-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-sm underline text-foreground w-fit"
        >
          Add provider
        </button>
      )}
    </Section>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      {description && <p className="text-xs text-muted-foreground mt-1 mb-4">{description}</p>}
      <div className={description ? "space-y-4" : "space-y-4 mt-4"}>{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-sm text-foreground mb-1.5">{label}</div>
      {children}
      {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
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
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <div className="text-sm text-foreground">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
