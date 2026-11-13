import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { setMockLatency } from "@/services/mock";
import type { Task } from "@/types";
import { applyTask } from "@/features/development-map/graph";
import { useTasks, useUpdateTask } from "./queries";

beforeAll(() => setMockLatency(0));
const wrap = (qc: QueryClient) => ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;

describe("shared task records", () => {
  it("updates every cached copy at once and bumps the version", async () => {
    const qc = new QueryClient();
    const w = wrap(qc);
    const all = renderHook(() => useTasks(), { wrapper: w });
    const project = renderHook(() => useTasks("p2"), { wrapper: w });
    await waitFor(() => expect(all.result.current.data && project.result.current.data).toBeTruthy());
    const before = project.result.current.data!.find((t) => t.id === "t6")!;
    const update = renderHook(() => useUpdateTask(), { wrapper: w });
    update.result.current.mutate({ id: "t6", patch: { status: "testing" } });
    await waitFor(() => expect(update.result.current.isSuccess).toBe(true));
    const pick = (list?: Task[]) => list?.find((t) => t.id === "t6");
    expect(pick(all.result.current.data)).toMatchObject({ status: "testing", version: before.version + 1 });
    expect(pick(project.result.current.data)).toMatchObject({ status: "testing", version: before.version + 1 });
  });
  it("lets quick consecutive edits through without version conflicts", async () => {
    const qc = new QueryClient();
    const w = wrap(qc);
    const tasks = renderHook(() => useTasks(), { wrapper: w });
    await waitFor(() => expect(tasks.result.current.data).toBeTruthy());
    const start = tasks.result.current.data!.find((t) => t.id === "t8")!.version;
    const update = renderHook(() => useUpdateTask(), { wrapper: w });
    update.result.current.mutate({ id: "t8", patch: { priority: "low" } });
    update.result.current.mutate({ id: "t8", patch: { assigneeId: "u2" } });
    update.result.current.mutate({ id: "t8", patch: { progress: 25 } });
    await waitFor(() => expect(tasks.result.current.data!.find((t) => t.id === "t8")?.version).toBe(start + 3));
    expect(update.result.current.isError).toBe(false);
    expect(tasks.result.current.data!.find((t) => t.id === "t8")).toMatchObject({ priority: "low", assigneeId: "u2", progress: 25 });
  });
  it("shows a linked task's live fields on its development node", () => {
    const node = { id: "n", title: "Old", status: "todo", priority: "low", assigneeId: null, dueDate: null, progress: 0, description: "keep" } as never;
    const task = { title: "New", status: "blocked", priority: "urgent", assigneeId: "u3", dueDate: "2026-12-01", progress: 40 } as Task;
    expect(applyTask(node, task)).toMatchObject({ title: "New", status: "blocked", priority: "urgent", assigneeId: "u3", progress: 40, description: "keep" });
    expect(applyTask(node, undefined)).toBe(node);
  });
});
