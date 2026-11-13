import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services";

export const boardKeys = {
  all: ["boards"] as const,
  list: (projectId?: string, trashed = false) => ["boards", "list", projectId ?? "all", trashed] as const,
  detail: (id: string) => ["boards", "detail", id] as const,
};

export const useBoards = (opts: { projectId?: string; trashed?: boolean } = {}) =>
  useQuery({ queryKey: boardKeys.list(opts.projectId, opts.trashed), queryFn: () => api.boards.list(opts) });

/** The full document is fetched once per editor session, so it is never refetched in the background. */
export const useBoard = (id?: string) =>
  useQuery({ queryKey: boardKeys.detail(id ?? ""), queryFn: () => api.boards.get(id!), enabled: !!id, staleTime: Infinity });

function useBoardMutation<V>(fn: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: ["boards", "list"] }) });
}
export const useCreateBoard = () => useBoardMutation((v: { projectId: string; name: string }) => api.boards.create(v.projectId, v.name));
export const useRenameBoard = () => useBoardMutation((v: { id: string; name: string; version: number }) => api.boards.rename(v.id, v.name, v.version));
export const useDuplicateBoard = () => useBoardMutation((id: string) => api.boards.duplicate(id));
export const useTrashBoard = () => useBoardMutation((id: string) => api.boards.trash(id));
export const useRestoreBoard = () => useBoardMutation((id: string) => api.boards.restore(id));

/** Plain call (not a mutation) so autosaves do not trigger list refetches. */
export const saveBoardDocument = (id: string, document: string, version: number) => api.boards.saveDocument(id, document, version);
