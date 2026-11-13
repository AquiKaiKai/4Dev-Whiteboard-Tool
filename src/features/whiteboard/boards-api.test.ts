import { ConflictError } from "@/services/api/types";
import { failNextMockSave, mockApi, setMockLatency } from "@/services/mock";

beforeAll(() => setMockLatency(0));

describe("mock boards api", () => {
  it("moves boards to trash and restores them", async () => {
    const b = await mockApi.boards.create("p1", "Trash test");
    await mockApi.boards.trash(b.id);
    expect((await mockApi.boards.list({ projectId: "p1" })).some((x) => x.id === b.id)).toBe(false);
    expect((await mockApi.boards.list({ projectId: "p1", trashed: true })).some((x) => x.id === b.id)).toBe(true);
    await mockApi.boards.restore(b.id);
    expect((await mockApi.boards.list({ projectId: "p1" })).some((x) => x.id === b.id)).toBe(true);
  });
  it("duplicates a board with its document", async () => {
    const src = await mockApi.boards.create("p1", "Original");
    await mockApi.boards.saveDocument(src.id, '{"objects":[]}', src.version);
    const copy = await mockApi.boards.duplicate(src.id);
    expect(copy.name).toBe("Original (copy)");
    expect((await mockApi.boards.get(copy.id)).document).toBe('{"objects":[]}');
  });
  it("rejects stale saves and surfaces a simulated server failure", async () => {
    const b = await mockApi.boards.create("p1", "Versioned");
    await mockApi.boards.saveDocument(b.id, "{}", b.version);
    await expect(mockApi.boards.saveDocument(b.id, "{}", b.version)).rejects.toBeInstanceOf(ConflictError);
    failNextMockSave();
    await expect(mockApi.boards.saveDocument(b.id, "{}", b.version + 1)).rejects.toThrow(/could not save/);
  });
});
