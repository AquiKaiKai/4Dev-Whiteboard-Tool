import { ConflictError } from "../api/types";
import { mockApi, setMockLatency } from ".";

beforeAll(() => setMockLatency(0));

describe("mock projects api", () => {
  it("rejects writes made with a stale version", async () => {
    const p = await mockApi.projects.get("p1");
    await mockApi.projects.update("p1", { name: "Renamed" }, p.version);
    await expect(mockApi.projects.update("p1", { name: "Stale" }, p.version)).rejects.toBeInstanceOf(ConflictError);
  });
  it("creates projects with an id, code and version 1", async () => {
    const p = await mockApi.projects.create({ name: "Test Project", description: "", ownerId: "u1", memberIds: ["u1"], status: "planning", priority: "low", startDate: "2026-11-10", targetDate: "2026-12-10" });
    expect(p).toMatchObject({ version: 1, progress: 0 });
    expect(p.code).toMatch(/^DEV-\d+$/);
  });
});
