import { MarkerType, applyEdgeChanges, applyNodeChanges, type Edge, type EdgeChange, type Node, type NodeChange } from "@xyflow/react";
import { create } from "zustand";
import { useSessionStore } from "@/stores/session-store";
import type { ChecklistItem, DevEdge, DevGroup, DevMap, DevNode, EdgeKind, NodeType } from "@/types";
import { edgeKindLabel, nodeTypeMeta } from "./constants";
import { noFilters, progressFromChecklist, validateConnection, type Filters } from "./graph";

export type DevFlowNode = Node<{ dev: DevNode }, "dev">;
export type GroupFlowNode = Node<{ group: DevGroup }, "group">;
export type FlowNode = DevFlowNode | GroupFlowNode;
export type FlowEdge = Edge<{ kind: EdgeKind }>;
export const isDev = (n: FlowNode): n is DevFlowNode => n.type === "dev";
export const isGroup = (n: FlowNode): n is GroupFlowNode => n.type === "group";

const edgeStyle: Record<EdgeKind, { stroke: string; strokeDasharray?: string }> = {
  depends_on: { stroke: "hsl(var(--primary))" },
  blocks: { stroke: "hsl(var(--destructive))" },
  related: { stroke: "hsl(var(--muted-foreground))", strokeDasharray: "5 4" },
  parent_of: { stroke: "hsl(var(--muted-foreground))", strokeDasharray: "2 4" },
  child_of: { stroke: "hsl(var(--muted-foreground))", strokeDasharray: "2 4" },
};
const toFlowEdge = (e: DevEdge): FlowEdge => ({
  id: e.id, source: e.source, target: e.target, data: { kind: e.kind }, label: edgeKindLabel[e.kind],
  markerEnd: { type: MarkerType.ArrowClosed, color: edgeStyle[e.kind].stroke }, style: edgeStyle[e.kind],
  labelStyle: { fill: "hsl(var(--muted-foreground))", fontSize: 11 }, labelBgStyle: { fill: "hsl(var(--background))" },
});
const uid = () => crypto.randomUUID();
const entry = (message: string) => ({ id: uid(), actorId: useSessionStore.getState().userId, message, at: new Date().toISOString() });
const now = () => new Date().toISOString();

/** Edges of soft-deleted nodes stay in the data but are hidden on the canvas. */
const withHiddenEdges = (nodes: FlowNode[], edges: FlowEdge[]) => {
  const hidden = new Set(nodes.filter((n) => n.hidden).map((n) => n.id));
  return edges.map((e) => (!!e.hidden === (hidden.has(e.source) || hidden.has(e.target)) ? e : { ...e, hidden: hidden.has(e.source) || hidden.has(e.target) }));
};

interface MapState {
  projectId: string | null;
  nodes: FlowNode[];
  edges: FlowEdge[];
  filters: Filters;
  linkKind: EdgeKind;
  /** Incremented on every change that should be saved (not on selection or measuring). */
  rev: number;
  load: (map: DevMap) => void;
  serialize: () => Pick<DevMap, "nodes" | "groups" | "edges">;
  onNodesChange: (c: NodeChange<FlowNode>[]) => void;
  onEdgesChange: (c: EdgeChange<FlowEdge>[]) => void;
  addNode: (type: NodeType, position: { x: number; y: number }) => string;
  updateNode: (id: string, patch: Partial<DevNode>, activity?: string) => void;
  setChecklist: (id: string, items: ChecklistItem[]) => void;
  addComment: (id: string, text: string) => void;
  connect: (c: { source: string; target: string; kind?: EdgeKind }) => { ok: true } | { ok: false; reason: string };
  removeEdge: (id: string) => void;
  softDelete: (ids: string[]) => void;
  restore: (id: string) => void;
  duplicateSelected: () => void;
  groupSelected: () => boolean;
  ungroup: (groupId: string) => void;
  renameGroup: (id: string, name: string) => void;
  setFilters: (p: Partial<Filters>) => void;
  setLinkKind: (k: EdgeKind) => void;
}

export const useMapStore = create<MapState>((set, get) => {
  const edit = (id: string, fn: (d: DevNode) => DevNode) =>
    set((s) => ({ nodes: s.nodes.map((n) => (isDev(n) && n.id === id ? { ...n, data: { dev: fn(n.data.dev) } } : n)), rev: s.rev + 1 }));

  return {
    projectId: null, nodes: [], edges: [], filters: noFilters, linkKind: "depends_on", rev: 0,

    load: (map) => {
      const groups: GroupFlowNode[] = map.groups.map((g) => ({
        id: g.id, type: "group", position: g.position, data: { group: g }, style: { width: g.width, height: g.height }, zIndex: -1,
      }));
      const devs: DevFlowNode[] = map.nodes.map((n) => {
        const g = n.groupId ? map.groups.find((x) => x.id === n.groupId) : undefined;
        return {
          id: n.id, type: "dev", data: { dev: n }, hidden: !!n.deletedAt,
          position: g ? { x: n.position.x - g.position.x, y: n.position.y - g.position.y } : n.position,
          ...(g ? { parentId: g.id, extent: "parent" as const } : {}),
        };
      });
      const nodes = [...groups, ...devs];
      set({ projectId: map.projectId, nodes, edges: withHiddenEdges(nodes, map.edges.map(toFlowEdge)), filters: noFilters, rev: 0 });
    },

    serialize: () => {
      const { nodes, edges } = get();
      const groups = nodes.filter(isGroup).map((n) => ({ ...n.data.group, position: n.position }));
      const at = new Map(groups.map((g) => [g.id, g.position]));
      return {
        groups,
        nodes: nodes.filter(isDev).map((n) => {
          const gp = n.parentId ? at.get(n.parentId) : undefined;
          return { ...n.data.dev, groupId: n.parentId ?? null, position: gp ? { x: n.position.x + gp.x, y: n.position.y + gp.y } : n.position };
        }),
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, kind: e.data!.kind })),
      };
    },

    onNodesChange: (changes) => {
      let saved = false;
      const keep: NodeChange<FlowNode>[] = [];
      for (const c of changes) {
        if (c.type === "remove") {
          if (get().nodes.find((n) => n.id === c.id)?.type === "group") get().ungroup(c.id);
          else get().softDelete([c.id]);
          continue;
        }
        if (c.type === "position" && c.dragging === false) saved = true;
        keep.push(c);
      }
      set((s) => ({ nodes: applyNodeChanges(keep, s.nodes), rev: s.rev + (saved ? 1 : 0) }));
    },
    onEdgesChange: (changes) =>
      set((s) => ({ edges: applyEdgeChanges(changes, s.edges), rev: s.rev + (changes.some((c) => c.type === "remove") ? 1 : 0) })),

    addNode: (type, position) => {
      const id = uid();
      const project = get().projectId ?? "";
      const dev: DevNode = {
        id, projectId: project, type, title: `New ${nodeTypeMeta[type].label.toLowerCase()}`, description: "", status: "todo", priority: "medium",
        assigneeId: null, startDate: null, dueDate: null, progress: 0, labels: [], checklist: [], comments: [], attachments: [],
        activity: [entry(`created this ${nodeTypeMeta[type].label.toLowerCase()}`)], taskId: null, groupId: null, position, deletedAt: null,
      };
      set((s) => ({
        nodes: [...s.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)), { id, type: "dev", position, data: { dev }, selected: true } as DevFlowNode],
        rev: s.rev + 1,
      }));
      return id;
    },

    updateNode: (id, patch, activity) =>
      edit(id, (d) => ({ ...d, ...patch, activity: activity ? [entry(activity), ...d.activity] : d.activity })),
    setChecklist: (id, items) =>
      edit(id, (d) => ({ ...d, checklist: items, progress: progressFromChecklist(items) ?? d.progress })),
    addComment: (id, text) =>
      edit(id, (d) => ({ ...d, comments: [...d.comments, { id: uid(), authorId: useSessionStore.getState().userId, text, at: now() }] })),

    connect: ({ source, target, kind }) => {
      const k = kind ?? get().linkKind;
      const existing = get().edges.map((e) => ({ id: e.id, source: e.source, target: e.target, kind: e.data!.kind }));
      const result = validateConnection(existing, { source, target, kind: k });
      if (result.ok) set((s) => ({ edges: [...s.edges, toFlowEdge({ id: uid(), source, target, kind: k })], rev: s.rev + 1 }));
      return result;
    },
    removeEdge: (id) => set((s) => ({ edges: s.edges.filter((e) => e.id !== id), rev: s.rev + 1 })),

    softDelete: (ids) =>
      set((s) => {
        const nodes = s.nodes.map((n) =>
          isDev(n) && ids.includes(n.id)
            ? { ...n, hidden: true, selected: false, data: { dev: { ...n.data.dev, deletedAt: now(), activity: [entry("deleted this node"), ...n.data.dev.activity] } } }
            : n);
        return { nodes, edges: withHiddenEdges(nodes, s.edges), rev: s.rev + 1 };
      }),
    restore: (id) =>
      set((s) => {
        const nodes = s.nodes.map((n) =>
          isDev(n) && n.id === id
            ? { ...n, hidden: false, data: { dev: { ...n.data.dev, deletedAt: null, activity: [entry("restored this node"), ...n.data.dev.activity] } } }
            : n);
        return { nodes, edges: withHiddenEdges(nodes, s.edges), rev: s.rev + 1 };
      }),

    duplicateSelected: () =>
      set((s) => {
        const picked = s.nodes.filter((n): n is DevFlowNode => isDev(n) && !!n.selected && !n.hidden);
        if (!picked.length) return s;
        const copies: DevFlowNode[] = picked.map((n) => {
          const id = uid();
          const dev = { ...n.data.dev, id, title: `${n.data.dev.title} (copy)`, comments: [], activity: [entry("duplicated from another node")], deletedAt: null };
          return { ...n, id, selected: true, position: { x: n.position.x + 40, y: n.position.y + 40 }, data: { dev } };
        });
        return { nodes: [...s.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)), ...copies], rev: s.rev + 1 };
      }),

    groupSelected: () => {
      const picked = get().nodes.filter((n): n is DevFlowNode => isDev(n) && !!n.selected && !n.hidden && !n.parentId);
      if (picked.length < 2) return false;
      const w = (n: DevFlowNode) => n.measured?.width ?? 240;
      const h = (n: DevFlowNode) => n.measured?.height ?? 120;
      const minX = Math.min(...picked.map((n) => n.position.x)) - 24;
      const minY = Math.min(...picked.map((n) => n.position.y)) - 44;
      const width = Math.max(...picked.map((n) => n.position.x + w(n))) + 24 - minX;
      const height = Math.max(...picked.map((n) => n.position.y + h(n))) + 24 - minY;
      const id = uid();
      const group: GroupFlowNode = {
        id, type: "group", position: { x: minX, y: minY }, selected: true, zIndex: -1, style: { width, height },
        data: { group: { id, name: "Group", position: { x: minX, y: minY }, width, height } },
      };
      const ids = new Set(picked.map((n) => n.id));
      set((s) => ({
        nodes: [group, ...s.nodes.map((n) => (ids.has(n.id) ? { ...n, selected: false, parentId: id, extent: "parent" as const, position: { x: n.position.x - minX, y: n.position.y - minY } } : { ...n, selected: false }))],
        rev: s.rev + 1,
      }));
      return true;
    },
    ungroup: (groupId) =>
      set((s) => {
        const g = s.nodes.find((n) => n.id === groupId);
        if (!g) return s;
        const nodes = s.nodes.filter((n) => n.id !== groupId).map((n) =>
          n.parentId === groupId ? { ...n, parentId: undefined, extent: undefined, position: { x: n.position.x + g.position.x, y: n.position.y + g.position.y } } : n);
        return { nodes, rev: s.rev + 1 };
      }),
    renameGroup: (id, name) =>
      set((s) => ({ nodes: s.nodes.map((n) => (isGroup(n) && n.id === id ? { ...n, data: { group: { ...n.data.group, name } } } : n)), rev: s.rev + 1 })),

    setFilters: (p) => set((s) => ({ filters: { ...s.filters, ...p } })),
    setLinkKind: (linkKind) => set({ linkKind }),
  };
});
