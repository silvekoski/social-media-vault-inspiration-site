export type OrgPlan = "free" | "team" | "business" | "enterprise";
export type OrgRole = "owner" | "admin" | "operator" | "viewer";
export type MemberStatus = "active" | "invited" | "suspended";

export type OrgMember = {
  id: string;
  name: string;
  email: string;
  role: OrgRole;
  status: MemberStatus;
  lastActiveAt: string;
  joinedAt: string;
};

export type Organization = {
  id: string;
  slug: string;
  name: string;
  plan: OrgPlan;
  createdAt: string;
  region: string;
  seats: { used: number; total: number };
  storage: { usedGb: number; totalGb: number };
  monthlyCaptures: { used: number; total: number };
  projects: number;
  creators: number;
  members: OrgMember[];
};

export const organizations: Organization[] = [
  {
    id: "org_main",
    slug: "silvekoski",
    name: "Silvekoski",
    plan: "business",
    createdAt: "2024-08-12T10:00:00Z",
    region: "eu-central-1",
    seats: { used: 7, total: 15 },
    storage: { usedGb: 412, totalGb: 1000 },
    monthlyCaptures: { used: 18420, total: 50000 },
    projects: 12,
    creators: 184,
    members: [
      { id: "m1", name: "Alex Morgan", email: "alex@vault.io", role: "owner", status: "active", lastActiveAt: "2026-06-28T08:12:00Z", joinedAt: "2024-08-12T10:00:00Z" },
      { id: "m2", name: "Priya Shah", email: "priya@vault.io", role: "admin", status: "active", lastActiveAt: "2026-06-27T19:44:00Z", joinedAt: "2024-09-02T09:00:00Z" },
      { id: "m3", name: "Tomáš Novak", email: "tomas@vault.io", role: "operator", status: "active", lastActiveAt: "2026-06-28T07:30:00Z", joinedAt: "2024-11-18T11:30:00Z" },
      { id: "m4", name: "Léa Dubois", email: "lea@vault.io", role: "operator", status: "active", lastActiveAt: "2026-06-26T22:10:00Z", joinedAt: "2025-01-04T14:20:00Z" },
      { id: "m5", name: "Marcus Hill", email: "marcus@vault.io", role: "viewer", status: "active", lastActiveAt: "2026-06-25T16:00:00Z", joinedAt: "2025-03-21T08:00:00Z" },
      { id: "m6", name: "Sofia Reyes", email: "sofia@vault.io", role: "operator", status: "invited", lastActiveAt: "", joinedAt: "2026-06-20T10:00:00Z" },
      { id: "m7", name: "Ken Tanaka", email: "ken@vault.io", role: "viewer", status: "suspended", lastActiveAt: "2026-04-12T11:00:00Z", joinedAt: "2025-05-12T09:00:00Z" },
    ],
  },
  {
    id: "org_studio",
    slug: "lnx",
    name: "lnx",
    plan: "team",
    createdAt: "2025-02-04T12:00:00Z",
    region: "us-east-1",
    seats: { used: 3, total: 5 },
    storage: { usedGb: 88, totalGb: 250 },
    monthlyCaptures: { used: 4120, total: 10000 },
    projects: 4,
    creators: 32,
    members: [
      { id: "n1", name: "Jamie Cole", email: "jamie@northstudio.co", role: "owner", status: "active", lastActiveAt: "2026-06-28T06:00:00Z", joinedAt: "2025-02-04T12:00:00Z" },
      { id: "n2", name: "Dana Pierce", email: "dana@northstudio.co", role: "operator", status: "active", lastActiveAt: "2026-06-27T13:00:00Z", joinedAt: "2025-02-08T12:00:00Z" },
      { id: "n3", name: "Oren Vasquez", email: "oren@northstudio.co", role: "viewer", status: "active", lastActiveAt: "2026-06-26T10:00:00Z", joinedAt: "2025-04-12T09:00:00Z" },
    ],
  },
  {
    id: "org_research",
    slug: "movaroo",
    name: "Movaroo",
    plan: "enterprise",
    createdAt: "2024-03-01T09:00:00Z",
    region: "eu-west-2",
    seats: { used: 42, total: 100 },
    storage: { usedGb: 6240, totalGb: 20000 },
    monthlyCaptures: { used: 312000, total: 1000000 },
    projects: 38,
    creators: 1240,
    members: [
      { id: "a1", name: "Dr. Elena Park", email: "epark@atlas-research.org", role: "owner", status: "active", lastActiveAt: "2026-06-28T09:00:00Z", joinedAt: "2024-03-01T09:00:00Z" },
      { id: "a2", name: "Rahim Osei", email: "rahim@atlas-research.org", role: "admin", status: "active", lastActiveAt: "2026-06-28T08:00:00Z", joinedAt: "2024-03-08T10:00:00Z" },
      { id: "a3", name: "Wei Zhang", email: "wei@atlas-research.org", role: "admin", status: "active", lastActiveAt: "2026-06-27T20:00:00Z", joinedAt: "2024-05-12T09:00:00Z" },
      { id: "a4", name: "Camille Roy", email: "camille@atlas-research.org", role: "operator", status: "active", lastActiveAt: "2026-06-28T07:00:00Z", joinedAt: "2024-09-01T09:00:00Z" },
    ],
  },
];

export const currentOrgId = "org_main";

export function getCurrentOrg() {
  return organizations.find((o) => o.id === currentOrgId)!;
}
