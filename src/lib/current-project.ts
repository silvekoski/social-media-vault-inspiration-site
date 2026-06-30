import { useSyncExternalStore, useMemo } from "react";
import { projects as allProjects } from "./mock-projects";
import { useCurrentOrgId } from "./current-org";

// Map org -> selected project id (or "all")
const selection: Record<string, string> = {};
const listeners = new Set<() => void>();

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
function getSnapshot() {
  return JSON.stringify(selection);
}

export function setCurrentProjectId(orgId: string, projectId: string) {
  if (selection[orgId] === projectId) return;
  selection[orgId] = projectId;
  listeners.forEach((l) => l());
}

export function useProjectsForOrg() {
  const orgId = useCurrentOrgId();
  return useMemo(() => allProjects.filter((p) => p.orgId === orgId), [orgId]);
}

export function useCurrentProject() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const orgId = useCurrentOrgId();
  const projects = useProjectsForOrg();
  const id = selection[orgId] ?? "all";
  if (id === "all") return null;
  return projects.find((p) => p.id === id) ?? null;
}

export function useCurrentProjectId() {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const orgId = useCurrentOrgId();
  return selection[orgId] ?? "all";
}
