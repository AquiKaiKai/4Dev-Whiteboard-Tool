import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "@/services";
import { NotFoundError, type TaskInput, type TaskPatch } from "@/services/api/types";
import type { Task } from "@/types";

export const taskKeys = { all: ["tasks"] as const, list: (projectId?: string) => ["tasks", projectId ?? "all"] as const };

export const useTasks = (projectId?: string) =>
  useQuery({ queryKey: taskKeys.list(projectId), queryFn: () => api.tasks.list({ projectId }) });

export const useCreateTask = () => {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: TaskInput) => api.tasks.create(input), onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }) });
};

const findCached = (qc: QueryClient, id: string) =>
  qc.getQueriesData<Task[]>({ queryKey: taskKeys.all }).flatMap(([, d]) => d ?? []).find((t) => t.id === id);
const patchCached = (qc: QueryClient, id: string, fn: (t: Task) => Task) =>
  qc.setQueriesData<Task[]>({ queryKey: taskKeys.all }, (old) => old?.map((t) => (t.id === id ? fn(t) : t)));

/**
 * Edits apply instantly (optimistic) and are sent one at a time, each with the newest known version,
 * so quick consecutive edits never conflict with each other. A real conflict or failure reloads the server copy.
 * Every view shares the same cached task records, so one edit updates Kanban, list and map together.
 */
export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    scope: { id: "task-edits" },
    mutationFn: ({ id, patch }: { id: string; patch: TaskPatch }) => {
      const current = findCached(qc, id);
      if (!current) throw new NotFoundError("Task");
      return api.tasks.update(id, patch, current.version);
    },
    onMutate: ({ id, patch }) => { patchCached(qc, id, (t) => ({ ...t, ...patch })); },
    onSuccess: (saved) => patchCached(qc, saved.id, (t) => ({ ...t, version: saved.version })),
    onError: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}
