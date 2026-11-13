import type { DevMap, DevNode } from "@/types";
import { isDev, isGroup, useMapStore } from "./map-store";

const dev = (id: string, x: number, y: number): DevNode => ({
  id, projectId: "p", type: "task", title: id, description: "", status: "todo", priority: "medium", assigneeId: null, startDate: null, dueDate: null,
  progress: 0, labels: [], checklist: [], comments: [], attachments: [], activity: [], taskId: null, groupId: null, position: { x, y }, deletedAt: null,
});
const map = (): DevMap => ({ projectId: "p", version: 1, groups: [], edges: [{ id: "e1", source: "a", target: "b", kind: "depends_on" }], nodes: [dev("a", 0, 0), dev("b", 300, 0), dev("c", 600, 100)], updatedAt: "" });
const s = () => useMapStore.getState();
const select = (...ids: string[]) => useMapStore.setState((st) => ({ nodes: st.nodes.map((n) => ({ ...n, selected: ids.includes(n.id) })) }));

beforeEach(() => s().load(map()));

describe("map store", () => {
  it("round-trips a map without changing it", () => {
    const out = s().serialize();
    expect(out.nodes.map((n) => [n.id, n.position])).toEqual(map().nodes.map((n) => [n.id, n.position]));
    expect(out.edges).toEqual(map().edges);
  });
  it("soft-deletes nodes, hides their links, and restores them", () => {
    s().softDelete(["a"]);
    expect(s().edges[0]?.hidden).toBe(true);
    expect(s().serialize().nodes.find((n) => n.id === "a")?.deletedAt).toBeTruthy();
    s().restore("a");
    expect(s().edges[0]?.hidden).toBe(false);
    expect(s().serialize().nodes.find((n) => n.id === "a")?.deletedAt).toBeNull();
  });
  it("only bumps the save counter for real changes", () => {
    select("a");
    expect(s().rev).toBe(0);
    s().updateNode("a", { status: "blocked" }, "changed status");
    expect(s().rev).toBe(1);
    expect(s().serialize().nodes[0]?.activity[0]?.message).toBe("changed status");
  });
  it("refuses links that would create a cycle", () => {
    expect(s().connect({ source: "b", target: "a", kind: "depends_on" }).ok).toBe(false);
    expect(s().connect({ source: "c", target: "a", kind: "depends_on" }).ok).toBe(true);
    expect(s().edges).toHaveLength(2);
  });
  it("groups selected nodes and keeps absolute positions when saved and ungrouped", () => {
    select("a", "b");
    expect(s().groupSelected()).toBe(true);
    const grouped = s().serialize();
    expect(grouped.groups).toHaveLength(1);
    expect(grouped.nodes.find((n) => n.id === "b")).toMatchObject({ groupId: grouped.groups[0]?.id, position: { x: 300, y: 0 } });
    const reloaded = (() => { s().load({ ...map(), ...grouped }); return s().serialize(); })();
    expect(reloaded.nodes.find((n) => n.id === "b")?.position).toEqual({ x: 300, y: 0 });
    s().ungroup(grouped.groups[0]!.id);
    expect(s().nodes.some(isGroup)).toBe(false);
    expect(s().nodes.filter(isDev).find((n) => n.id === "b")?.position).toEqual({ x: 300, y: 0 });
  });
  it("duplicates selected nodes without copying links", () => {
    select("c");
    s().duplicateSelected();
    expect(s().nodes.filter(isDev)).toHaveLength(4);
    expect(s().edges).toHaveLength(1);
  });
  it("rejects grouping fewer than two nodes", () => {
    select("a");
    expect(s().groupSelected()).toBe(false);
  });
});
