import { useMemo } from "react";
import { useCurrentOrgId } from "./current-org";
import { creators as allBaseCreators, runs as allRuns, posts as basePosts, prompts as allPrompts } from "./mock-data";
import { allCreators as fullCreatorRoster, archivePosts as fullArchive } from "./mock-archive";
import { projects as allProjects } from "./mock-projects";
import { scrapers as allScrapers, routingTable as allRouting } from "./mock-scrapers";

type Scope = {
  baseCreatorTake: number;
  baseCreatorOffset: number;
  rosterTake: number;
  rosterOffset: number;
  archiveFraction: number; // fraction of full archive after creator filter
  runTake: number;
  runOffset: number;
  projectTake: number;
  projectOffset: number;
  promptTake: number;
  promptOffset: number;
  scraperIds: string[] | null; // null = all
};

const SCOPES: Record<string, Scope> = {
  org_main: {
    baseCreatorTake: 999, baseCreatorOffset: 0,
    rosterTake: 999, rosterOffset: 0,
    archiveFraction: 1,
    runTake: 999, runOffset: 0,
    projectTake: 999, projectOffset: 0,
    promptTake: 999, promptOffset: 0,
    scraperIds: null,
  },
  org_studio: {
    baseCreatorTake: 6, baseCreatorOffset: 3,
    rosterTake: 22, rosterOffset: 14,
    archiveFraction: 0.18,
    runTake: 12, runOffset: 4,
    projectTake: 2, projectOffset: 1,
    promptTake: 2, promptOffset: 0,
    scraperIds: ["apify-follower", "tiktok-internal", "youtube-data-api"],
  },
  org_research: {
    baseCreatorTake: 14, baseCreatorOffset: 1,
    rosterTake: 80, rosterOffset: 20,
    archiveFraction: 0.55,
    runTake: 40, runOffset: 2,
    projectTake: 4, projectOffset: 2,
    promptTake: 999, promptOffset: 0,
    scraperIds: ["apify-follower", "brightdata-ig", "floxy-ig", "apidojo-tiktok", "youtube-data-api", "apify-youtube"],
  },
};

function getScope(id: string): Scope {
  return SCOPES[id] ?? SCOPES.org_main!;
}

export function useScopedBaseCreators() {
  const id = useCurrentOrgId();
  return useMemo(() => {
    const s = getScope(id);
    return allBaseCreators.slice(s.baseCreatorOffset, s.baseCreatorOffset + s.baseCreatorTake);
  }, [id]);
}

export function useScopedRoster() {
  const id = useCurrentOrgId();
  return useMemo(() => {
    const s = getScope(id);
    return fullCreatorRoster.slice(s.rosterOffset, s.rosterOffset + s.rosterTake);
  }, [id]);
}

export function useScopedArchive() {
  const id = useCurrentOrgId();
  const roster = useScopedRoster();
  return useMemo(() => {
    const s = getScope(id);
    const allowed = new Set(roster.map((c) => c.id));
    const filtered = fullArchive.filter((p) => allowed.has(p.creatorId));
    const take = Math.max(1, Math.floor(filtered.length * s.archiveFraction));
    return filtered.slice(0, take);
  }, [id, roster]);
}

export function useScopedBasePosts() {
  const id = useCurrentOrgId();
  return useMemo(() => {
    const allowed = new Set(
      getScopedBaseCreators(id).map((c) => c.id),
    );
    return basePosts.filter((p) => allowed.has(p.creatorId));
  }, [id]);
}

function getScopedBaseCreators(id: string) {
  const s = getScope(id);
  return allBaseCreators.slice(s.baseCreatorOffset, s.baseCreatorOffset + s.baseCreatorTake);
}

export function useScopedRuns() {
  const id = useCurrentOrgId();
  return useMemo(() => {
    const s = getScope(id);
    return allRuns.slice(s.runOffset, s.runOffset + s.runTake);
  }, [id]);
}

export function useScopedProjects() {
  const id = useCurrentOrgId();
  return useMemo(() => allProjects.filter((p) => p.orgId === id), [id]);
}

export function useScopedPrompts() {
  const id = useCurrentOrgId();
  return useMemo(() => {
    const s = getScope(id);
    return allPrompts.slice(s.promptOffset, s.promptOffset + s.promptTake);
  }, [id]);
}

export function useScopedScrapers() {
  const id = useCurrentOrgId();
  return useMemo(() => {
    const s = getScope(id);
    if (!s.scraperIds) return allScrapers;
    const allow = new Set(s.scraperIds);
    return allScrapers.filter((sc) => allow.has(sc.id));
  }, [id]);
}

export function useScopedRouting() {
  const id = useCurrentOrgId();
  return useMemo(() => {
    const s = getScope(id);
    if (!s.scraperIds) return allRouting;
    const allow = new Set(s.scraperIds);
    return allRouting
      .map((r) => ({
        ...r,
        primary: allow.has(r.primary) ? r.primary : (s.scraperIds!.find((id) => id) ?? r.primary),
        fallback: r.fallback && allow.has(r.fallback) ? r.fallback : undefined,
      }))
      .filter((r) => allow.has(r.primary));
  }, [id]);
}
