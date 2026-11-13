export type Role = "owner" | "editor" | "viewer";
export type Priority = "low" | "medium" | "high" | "urgent";
export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "archived";
export type TaskStatus =
  | "backlog" | "todo" | "in_progress" | "in_review" | "testing" | "blocked" | "completed" | "cancelled";
export type Availability = "available" | "busy" | "away";

export interface User {
  id: string;
  name: string;
  email: string;
  title: string;
  availability: Availability;
}
export interface Milestone {
  id: string;
  title: string;
  dueDate: string;
  done: boolean;
}
export interface Project {
  id: string;
  code: string;
  name: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  status: ProjectStatus;
  priority: Priority;
  startDate: string;
  targetDate: string;
  progress: number;
  milestones: Milestone[];
  /** Incremented by the server on every write; sent back with updates for conflict detection. */
  version: number;
  updatedAt: string;
}
export interface Subtask { id: string; title: string; done: boolean }
/** The one shared task record: Kanban, list and development-map views all read and write this. */
export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  labels: string[];
  subtasks: Subtask[];
  checklist: ChecklistItem[];
  comments: NodeComment[];
  assigneeId: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string;
  progress: number;
  version: number;
}
export interface Activity {
  id: string;
  actorId: string;
  projectId: string;
  message: string;
  at: string;
}

export interface Board {
  id: string;
  projectId: string;
  name: string;
  /** Serialized Fabric.js canvas JSON. Opaque to everything except the whiteboard engine. */
  document: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  /** Set when moved to trash; null while active. Restorable until the backend purges it. */
  deletedAt: string | null;
}
export type BoardSummary = Omit<Board, "document">;

export type NodeType = "project" | "epic" | "feature" | "task" | "subtask" | "bug" | "milestone" | "decision" | "note";
/** Edge direction: "source <kind> target", e.g. source depends_on target. */
export type EdgeKind = "depends_on" | "blocks" | "related" | "parent_of" | "child_of";
export interface ChecklistItem { id: string; text: string; done: boolean }
export interface NodeComment { id: string; authorId: string; text: string; at: string }
export interface NodeAttachment { id: string; name: string; size: number }
export interface NodeActivity { id: string; actorId: string; message: string; at: string }
export interface DevNode {
  id: string;
  projectId: string;
  type: NodeType;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string | null;
  startDate: string | null;
  dueDate: string | null;
  progress: number;
  labels: string[];
  checklist: ChecklistItem[];
  comments: NodeComment[];
  attachments: NodeAttachment[];
  activity: NodeActivity[];
  /** Link to a shared task record (task editing arrives in Phase 5). */
  taskId: string | null;
  groupId: string | null;
  /** Absolute canvas position, even when the node sits inside a group. */
  position: { x: number; y: number };
  /** Recoverable deletion: set when removed, cleared on restore. */
  deletedAt: string | null;
}
export interface DevGroup { id: string; name: string; position: { x: number; y: number }; width: number; height: number }
export interface DevEdge { id: string; source: string; target: string; kind: EdgeKind }
export interface DevMap {
  projectId: string;
  version: number;
  nodes: DevNode[];
  groups: DevGroup[];
  edges: DevEdge[];
  updatedAt: string;
}
export interface DevMapSummary { projectId: string; nodeCount: number; updatedAt: string }
