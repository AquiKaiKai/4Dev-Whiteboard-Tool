import { saveReducer, type SaveState } from "./save-state";

const run = (s: SaveState, ...types: Parameters<typeof saveReducer>[1][]) => types.reduce(saveReducer, s);

describe("saveReducer", () => {
  it("goes dirty -> saving -> saved", () => {
    expect(run({ status: "idle" }, { type: "change" }, { type: "start" }, { type: "success" }).status).toBe("saved");
  });
  it("stays unsaved when edits arrive during a save", () => {
    expect(run({ status: "idle" }, { type: "start" }, { type: "change" }, { type: "success" }).status).toBe("dirty");
  });
  it("keeps the error visible after a failure and recovers on retry", () => {
    const failed = run({ status: "dirty" }, { type: "start" }, { type: "fail", error: "boom" });
    expect(failed).toEqual({ status: "failed", error: "boom" });
    expect(run(failed, { type: "start" }, { type: "success" }).status).toBe("saved");
  });
});
