import { can } from "./permissions";

describe("can", () => {
  it("lets owners do everything", () => {
    for (const a of ["project.create", "project.edit", "project.archive", "project.members"] as const) expect(can("owner", a)).toBe(true);
  });
  it("lets editors create and edit but not archive or manage members", () => {
    expect(can("editor", "project.edit")).toBe(true);
    expect(can("editor", "project.archive")).toBe(false);
    expect(can("editor", "project.members")).toBe(false);
  });
  it("keeps viewers read-only", () => {
    expect(can("viewer", "project.create")).toBe(false);
    expect(can("viewer", "project.edit")).toBe(false);
  });
});
