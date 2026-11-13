import type { DevEdge, DevNode } from "@/types";
import { matchesFilters, noFilters, progressFromChecklist, validateConnection } from "./graph";

const e = (id: string, source: string, kind: DevEdge["kind"], target: string): DevEdge => ({ id, source, target, kind });
const node = (over: Partial<DevNode>) => ({ id: "n", title: "Login page", description: "", labels: ["frontend"], assigneeId: "u1", status: "todo", priority: "high", ...over }) as DevNode;

describe("validateConnection", () => {
  it("rejects self links and duplicates", () => {
    expect(validateConnection([], { source: "a", target: "a", kind: "depends_on" }).ok).toBe(false);
    expect(validateConnection([e("1", "a", "depends_on", "b")], { source: "a", target: "b", kind: "depends_on" }).ok).toBe(false);
  });
  it("treats 'a depends on b' and 'b blocks a' as the same relationship", () => {
    expect(validateConnection([e("1", "a", "depends_on", "b")], { source: "b", target: "a", kind: "blocks" }).ok).toBe(false);
  });
  it("blocks circular dependencies, including indirect ones and mixed kinds", () => {
    const edges = [e("1", "a", "depends_on", "b"), e("2", "b", "depends_on", "c")];
    const r = validateConnection(edges, { source: "c", target: "a", kind: "depends_on" });
    expect(r.ok).toBe(false);
    expect(validateConnection(edges, { source: "a", target: "c", kind: "blocks" }).ok).toBe(false); // a blocks c closes the loop c -> b -> a -> c
    expect(validateConnection(edges, { source: "a", target: "c", kind: "depends_on" }).ok).toBe(true);
  });
  it("keeps hierarchy and dependencies separate and allows related loops", () => {
    expect(validateConnection([e("1", "a", "parent_of", "b")], { source: "b", target: "a", kind: "depends_on" }).ok).toBe(true);
    expect(validateConnection([e("1", "a", "parent_of", "b")], { source: "a", target: "b", kind: "child_of" }).ok).toBe(false); // contradicts: a cannot be both parent and child of b
    expect(validateConnection([e("1", "a", "parent_of", "b")], { source: "a", target: "b", kind: "related" }).ok).toBe(true);
    expect(validateConnection([e("1", "a", "related", "b")], { source: "b", target: "a", kind: "related" }).ok).toBe(false);
  });
  it("stops a node becoming its own ancestor", () => {
    expect(validateConnection([e("1", "a", "parent_of", "b"), e("2", "b", "parent_of", "c")], { source: "c", target: "a", kind: "parent_of" }).ok).toBe(false);
  });
});

describe("matchesFilters", () => {
  it("matches everything with no filters", () => expect(matchesFilters(node({}), noFilters)).toBe(true));
  it("searches title, labels and id", () => {
    expect(matchesFilters(node({}), { ...noFilters, query: "LOGIN" })).toBe(true);
    expect(matchesFilters(node({}), { ...noFilters, query: "frontend" })).toBe(true);
    expect(matchesFilters(node({}), { ...noFilters, query: "payments" })).toBe(false);
  });
  it("combines developer, status and priority filters", () => {
    expect(matchesFilters(node({}), { ...noFilters, assigneeId: "u1", status: "todo", priority: "high" })).toBe(true);
    expect(matchesFilters(node({}), { ...noFilters, assigneeId: "u2" })).toBe(false);
    expect(matchesFilters(node({ assigneeId: null }), { ...noFilters, assigneeId: "unassigned" })).toBe(true);
    expect(matchesFilters(node({}), { ...noFilters, status: "blocked" })).toBe(false);
  });
});

describe("progressFromChecklist", () => {
  it("returns a percentage, or undefined for an empty checklist", () => {
    expect(progressFromChecklist([{ id: "1", text: "a", done: true }, { id: "2", text: "b", done: false }, { id: "3", text: "c", done: false }])).toBe(33);
    expect(progressFromChecklist([])).toBeUndefined();
  });
});
