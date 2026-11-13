import { projectSchema } from "./project";

const valid = { name: "New Site", description: "", ownerId: "u1", memberIds: ["u1"], status: "planning", priority: "medium", startDate: "2026-11-01", targetDate: "2026-12-01" };

describe("projectSchema", () => {
  it("accepts a valid project", () => expect(projectSchema.safeParse(valid).success).toBe(true));
  it("rejects short names", () => expect(projectSchema.safeParse({ ...valid, name: "ab" }).success).toBe(false));
  it("rejects a target date before the start date", () => {
    const r = projectSchema.safeParse({ ...valid, targetDate: "2026-10-01" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(["targetDate"]);
  });
});
