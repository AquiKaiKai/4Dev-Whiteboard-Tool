import type { ChecklistItem, Subtask, Task, TaskStatus } from "@/types";
import { todayISO } from "@/utils/dates";

export const kanbanColumns: TaskStatus[] = ["backlog", "todo", "in_progress", "in_review", "testing", "completed"];
export const extraColumns: TaskStatus[] = ["blocked", "cancelled"];

export interface TaskFilters { query: string; assigneeId: string; priority: string }
export const noTaskFilters: TaskFilters = { query: "", assigneeId: "", priority: "" };

export function filterTasks(tasks: Task[], f: TaskFilters) {
  const q = f.query.trim().toLowerCase();
  return tasks.filter((t) =>
    (!q || [t.title, t.description, ...t.labels].some((s) => s.toLowerCase().includes(q))) &&
    (!f.assigneeId || (f.assigneeId === "unassigned" ? t.assigneeId === null : t.assigneeId === f.assigneeId)) &&
    (!f.priority || t.priority === f.priority));
}

const rank = { urgent: 0, high: 1, medium: 2, low: 3 } as const;
export const compareDefault = (a: Task, b: Task) => rank[a.priority] - rank[b.priority] || a.dueDate.localeCompare(b.dueDate);

export function groupByStatus(tasks: Task[], statuses: TaskStatus[]) {
  const out = Object.fromEntries(statuses.map((s) => [s, [] as Task[]])) as Record<TaskStatus, Task[]>;
  for (const t of [...tasks].sort(compareDefault)) out[t.status]?.push(t);
  return out;
}

/** Progress follows subtasks and checklist items together; manual progress is kept when there are none. */
export function taskProgress(subtasks: Subtask[], checklist: ChecklistItem[], manual: number) {
  const total = subtasks.length + checklist.length;
  if (!total) return manual;
  return Math.round(((subtasks.filter((s) => s.done).length + checklist.filter((c) => c.done).length) / total) * 100);
}

/** Completing a task finishes its progress. Other moves leave progress alone. */
export const statusPatch = (t: { progress: number }, status: TaskStatus) =>
  ({ status, progress: status === "completed" ? 100 : t.progress });

export const isOverdue = (t: Pick<Task, "status" | "dueDate">, today = new Date()) =>
  !["completed", "cancelled"].includes(t.status) && t.dueDate < todayISO(today);

export type SortKey = "title" | "status" | "priority" | "dueDate" | "progress";
export function sortTasks(tasks: Task[], key: SortKey, dir: 1 | -1) {
  const val = (t: Task) => (key === "priority" ? rank[t.priority] : t[key]);
  return [...tasks].sort((a, b) => {
    const x = val(a), y = val(b);
    return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * dir;
  });
}
