import { Bug, CheckSquare, CornerDownRight, Flag, FolderKanban, GitFork, Layers, Sparkles, StickyNote, type LucideIcon } from "lucide-react";
import type { EdgeKind, NodeType } from "@/types";

export const nodeTypeMeta: Record<NodeType, { label: string; icon: LucideIcon; accent: string }> = {
  project: { label: "Project", icon: FolderKanban, accent: "border-l-violet-500" },
  epic: { label: "Epic", icon: Layers, accent: "border-l-indigo-500" },
  feature: { label: "Feature", icon: Sparkles, accent: "border-l-sky-500" },
  task: { label: "Task", icon: CheckSquare, accent: "border-l-primary" },
  subtask: { label: "Subtask", icon: CornerDownRight, accent: "border-l-slate-400" },
  bug: { label: "Bug", icon: Bug, accent: "border-l-red-500" },
  milestone: { label: "Milestone", icon: Flag, accent: "border-l-amber-500" },
  decision: { label: "Technical decision", icon: GitFork, accent: "border-l-teal-500" },
  note: { label: "Note", icon: StickyNote, accent: "border-l-yellow-400" },
};
export const nodeTypes = Object.keys(nodeTypeMeta) as NodeType[];

export const edgeKindLabel: Record<EdgeKind, string> = {
  depends_on: "depends on", blocks: "blocks", related: "related to", parent_of: "parent of", child_of: "child of",
};
export const edgeKinds = Object.keys(edgeKindLabel) as EdgeKind[];
/** How the same edge reads from the target's side. */
const inverse: Record<EdgeKind, string> = {
  depends_on: "is depended on by", blocks: "is blocked by", related: "related to", parent_of: "child of", child_of: "parent of",
};
export const relationPhrase = (kind: EdgeKind, outgoing: boolean) => (outgoing ? edgeKindLabel[kind] : inverse[kind]);
