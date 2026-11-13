import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProjectInput } from "@/schemas/project";
import { api } from "@/services";

export const projectKeys = { all: ["projects"] as const, detail: (id: string) => ["projects", id] as const };

export const useProjects = () => useQuery({ queryKey: projectKeys.all, queryFn: () => api.projects.list() });
export const useProject = (id?: string) =>
  useQuery({ queryKey: projectKeys.detail(id ?? ""), queryFn: () => api.projects.get(id!), enabled: !!id });

function useProjectMutation<V>(fn: (vars: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }) });
}
export const useCreateProject = () => useProjectMutation((input: ProjectInput) => api.projects.create(input));
export const useUpdateProject = () =>
  useProjectMutation((v: { id: string; patch: Partial<ProjectInput>; version: number }) =>
    api.projects.update(v.id, v.patch, v.version));
export const useArchiveProject = () =>
  useProjectMutation((v: { id: string; version: number }) => api.projects.archive(v.id, v.version));
export const useSetMembers = () =>
  useProjectMutation((v: { id: string; memberIds: string[]; version: number }) =>
    api.projects.setMembers(v.id, v.memberIds, v.version));
