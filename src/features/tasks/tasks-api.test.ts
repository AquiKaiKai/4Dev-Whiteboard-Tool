import { ConflictError } from "@/services/api/types";
import { mockApi, setMockLatency } from "@/services/mock";

beforeAll(() => setMockLatency(0));

describe("mock tasks api", () => {
  it("creates tasks with defaults and lists them by project", async () => {
    const t = await mockApi.tasks.create({ projectId: "p3", title: "Write brief", assigneeId: "u1", status: "todo", priority: "low", dueDate: "2026-12-01" });
    expect(t).toMatchObject({ version: 1, progress: 0, subtasks: [], comments: [] });
    expect((await mockApi.tasks.list({ projectId: "p3" })).some((x) => x.id === t.id)).toBe(true);
  });
  it("updates with version checks", async () => {
    const [first] = await mockApi.tasks.list({ projectId: "p1" });
    const saved = await mockApi.tasks.update(first!.id, { status: "testing" }, first!.version);
    expect(saved).toMatchObject({ status: "testing", version: first!.version + 1 });
    await expect(mockApi.tasks.update(first!.id, { status: "todo" }, first!.version)).rejects.toBeInstanceOf(ConflictError);
  });
});
