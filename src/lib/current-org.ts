import { useSyncExternalStore } from "react";
import { organizations } from "./mock-orgs";

let currentId = organizations[0].id;
const listeners = new Set<() => void>();

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot() {
  return currentId;
}

export function setCurrentOrgId(id: string) {
  if (id === currentId) return;
  currentId = id;
  listeners.forEach((l) => l());
}

export function useCurrentOrgId() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useCurrentOrg() {
  const id = useCurrentOrgId();
  return organizations.find((o) => o.id === id) ?? organizations[0];
}
