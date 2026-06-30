import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

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

        <div className="mt-8 space-y-10">
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
          </Section>

          <Divider />

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
          </Section>

          <Divider />

          <Section
            title="Connected accounts"
            description="Link a provider to enable single sign-on for your account."
          >
            <Row
              label="Google"
              hint="Sign in with your Google account."
              control={<button className="text-sm underline">Connect</button>}
            />
            <Row
              label="GitHub"
              hint="Connected as veikka"
              control={<button className="text-sm underline">Disconnect</button>}
            />
          </Section>

          <Divider />

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

          <Divider />

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

function Divider() {
  return <div className="border-t border-border" />;
}
