import { History } from "./history";

describe("History", () => {
  it("undoes and redoes in order", () => {
    const h = new History<string>();
    h.reset("a"); h.push("b"); h.push("c");
    expect(h.undo()).toBe("b");
    expect(h.undo()).toBe("a");
    expect(h.canUndo).toBe(false);
    expect(h.redo()).toBe("b");
    expect(h.canRedo).toBe(true);
  });
  it("drops the redo branch after a new change", () => {
    const h = new History<string>();
    h.reset("a"); h.push("b"); h.undo(); h.push("c");
    expect(h.canRedo).toBe(false);
    expect(h.undo()).toBe("a");
  });
  it("ignores identical consecutive snapshots and respects the limit", () => {
    const h = new History<number>(3);
    h.reset(0); h.push(0); expect(h.canUndo).toBe(false);
    [1, 2, 3, 4].forEach((n) => h.push(n));
    h.undo(); h.undo();
    expect(h.undo()).toBeUndefined();
  });
});
