import { ConflictError } from "@/services/api/types";
import { failNextMockSave, mockApi, setMockLatency } from "@/services/mock";

beforeAll(() => setMockLatency(0));

describe("mock maps api", () => {
  it("returns an empty map for projects without one and lists summaries", async () => {
    expect((await mockApi.maps.get("p-new")).nodes).toEqual([]);
    expect((await mockApi.maps.list()).find((m) => m.projectId === "p2")?.nodeCount).toBeGreaterThan(5);
  });
  it("saves with version checks and surfaces failures", async () => {
    const m = await mockApi.maps.get("p1");
    const saved = await mockApi.maps.save("p1", { nodes: m.nodes, groups: m.groups, edges: m.edges }, m.version);
    expect(saved.version).toBe(m.version + 1);
    await expect(mockApi.maps.save("p1", { nodes: [], groups: [], edges: [] }, m.version)).rejects.toBeInstanceOf(ConflictError);
    failNextMockSave();
    await expect(mockApi.maps.save("p1", { nodes: m.nodes, groups: [], edges: [] }, saved.version)).rejects.toThrow(/could not save/);
  });
});
