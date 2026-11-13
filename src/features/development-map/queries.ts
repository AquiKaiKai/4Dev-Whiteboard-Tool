import { useQuery } from "@tanstack/react-query";
import type { DevMap } from "@/types";
import { api } from "@/services";

export const mapKeys = { detail: (id: string) => ["maps", "detail", id] as const, list: ["maps", "list"] as const };
export const useDevMap = (projectId?: string) =>
  useQuery({ queryKey: mapKeys.detail(projectId ?? ""), queryFn: () => api.maps.get(projectId!), enabled: !!projectId, staleTime: Infinity });
export const useMapSummaries = () => useQuery({ queryKey: mapKeys.list, queryFn: () => api.maps.list() });

/** Plain call (not a mutation) so autosaves do not trigger refetches. */
export const saveDevMap = (projectId: string, doc: Pick<DevMap, "nodes" | "groups" | "edges">, version: number) =>
  api.maps.save(projectId, doc, version);
