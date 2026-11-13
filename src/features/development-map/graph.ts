import type { ChecklistItem, DevEdge, DevNode, EdgeKind, Task } from "@/types";

export interface Filters { query: string; assigneeId: string; status: string; priority: string }
export const noFilters: Filters = { query: "", assigneeId: "", status: "", priority: "" };
export const filtersActive = (f: Filters) => !!(f.query.trim() || f.assigneeId || f.status || f.priority);

export function matchesFilters(n: DevNode, f: Filters) {
  const q = f.query.trim().toLowerCase();
  if (q && ![n.title, n.description, n.id, ...n.labels].some((t) => t.toLowerCase().includes(q))) return false;
  if (f.assigneeId === "unassigned" ? n.assigneeId !== null : f.assigneeId && n.assigneeId !== f.assigneeId) return false;
  if (f.status && n.status !== f.status) return false;
  if (f.priority && n.priority !== f.priority) return false;
  return true;
}

export const progressFromChecklist = (items: ChecklistItem[]) =>
  items.length ? Math.round((items.filter((i) => i.done).length / items.length) * 100) : undefined;

type Link = { source: string; target: string; kind: EdgeKind };
/** Ordering relation as [first, second]. Dependencies and hierarchy are tracked as separate families. */
function ordered(e: Link): { family: "dep" | "tree"; from: string; to: string } | null {
  switch (e.kind) {
    case "depends_on": return { family: "dep", from: e.target, to: e.source };
    case "blocks": return { family: "dep", from: e.source, to: e.target };
    case "parent_of": return { family: "tree", from: e.source, to: e.target };
    case "child_of": return { family: "tree", from: e.target, to: e.source };
    default: return null;
  }
}

/** Frontend-only guard. The backend remains the authority on valid graphs. */
export function validateConnection(edges: DevEdge[], c: Link): { ok: true } | { ok: false; reason: string } {
  if (c.source === c.target) return { ok: false, reason: "A node can't be linked to itself." };
  const next = ordered(c);
  if (!next) {
    const dup = edges.some((e) => e.kind === "related" && ((e.source === c.source && e.target === c.target) || (e.source === c.target && e.target === c.source)));
    return dup ? { ok: false, reason: "These nodes are already related." } : { ok: true };
  }
  const same = edges.map(ordered).filter((o): o is NonNullable<typeof o> => !!o && o.family === next.family);
  if (same.some((o) => o.from === next.from && o.to === next.to)) return { ok: false, reason: "These nodes are already linked this way." };
  // Adding from -> to creates a cycle if `to` can already reach `from`.
  const seen = new Set<string>();
  const stack = [next.to];
  while (stack.length) {
    const cur = stack.pop()!;
    if (cur === next.from) return { ok: false, reason: next.family === "dep" ? "That would create a circular dependency." : "That would make a node its own ancestor." };
    if (seen.has(cur)) continue;
    seen.add(cur);
    same.filter((o) => o.from === cur).forEach((o) => stack.push(o.to));
  }
  return { ok: true };
}

/** A node linked to a task shows that task's live fields, so every view agrees. */
export const applyTask = (n: DevNode, t?: Task): DevNode =>
  t ? { ...n, title: t.title, status: t.status, priority: t.priority, assigneeId: t.assigneeId, dueDate: t.dueDate, progress: t.progress } : n;
