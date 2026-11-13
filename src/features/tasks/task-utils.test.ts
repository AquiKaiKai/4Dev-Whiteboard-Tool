import type { Task } from "@/types";
import { compareDefault, filterTasks, groupByStatus, isOverdue, noTaskFilters, sortTasks, statusPatch, taskProgress } from "./task-utils";

const t = (o: Partial<Task>) => ({ id: "x", title: "Task", description: "", labels: [], status: "todo", priority: "medium", dueDate: "2026-11-20", assigneeId: null, progress: 0, ...o }) as Task;

describe("task utils", () => {
  it("derives progress from subtasks and checklist together, else keeps manual progress", () => {
    expect(taskProgress([{ id: "1", title: "a", done: true }], [{ id: "2", text: "b", done: false }, { id: "3", text: "c", done: false }], 80)).toBe(33);
    expect(taskProgress([], [], 80)).toBe(80);
  });
  it("finishes progress when a task is completed and otherwise leaves it", () => {
    expect(statusPatch({ progress: 40 }, "completed")).toEqual({ status: "completed", progress: 100 });
    expect(statusPatch({ progress: 40 }, "testing")).toEqual({ status: "testing", progress: 40 });
  });
  it("orders by priority, then deadline", () => {
    const list = [t({ id: "a", priority: "low", dueDate: "2026-11-01" }), t({ id: "b", priority: "urgent", dueDate: "2026-12-01" }), t({ id: "c", priority: "urgent", dueDate: "2026-11-05" })];
    expect([...list].sort(compareDefault).map((x) => x.id)).toEqual(["c", "b", "a"]);
  });
  it("groups tasks by status column, ignoring statuses with no column", () => {
    const g = groupByStatus([t({ id: "a", status: "todo" }), t({ id: "b", status: "blocked" })], ["todo", "completed"]);
    expect(g.todo.map((x) => x.id)).toEqual(["a"]);
    expect(g.completed).toEqual([]);
  });
  it("filters by text, assignee and priority", () => {
    const list = [t({ id: "a", title: "Fix login", assigneeId: "u1", priority: "high" }), t({ id: "b", title: "Docs", labels: ["backend"] })];
    expect(filterTasks(list, { ...noTaskFilters, query: "LOGIN" }).map((x) => x.id)).toEqual(["a"]);
    expect(filterTasks(list, { ...noTaskFilters, query: "backend" }).map((x) => x.id)).toEqual(["b"]);
    expect(filterTasks(list, { ...noTaskFilters, assigneeId: "unassigned" }).map((x) => x.id)).toEqual(["b"]);
    expect(filterTasks(list, { ...noTaskFilters, priority: "high" }).map((x) => x.id)).toEqual(["a"]);
  });
  it("sorts by column in either direction", () => {
    const list = [t({ id: "a", progress: 50 }), t({ id: "b", progress: 10 })];
    expect(sortTasks(list, "progress", 1).map((x) => x.id)).toEqual(["b", "a"]);
    expect(sortTasks(list, "progress", -1).map((x) => x.id)).toEqual(["a", "b"]);
  });
  it("flags only open tasks as overdue", () => {
    const today = new Date("2026-11-15T10:00:00");
    expect(isOverdue(t({ dueDate: "2026-11-10" }), today)).toBe(true);
    expect(isOverdue(t({ dueDate: "2026-11-10", status: "completed" }), today)).toBe(false);
    expect(isOverdue(t({ dueDate: "2026-11-20" }), today)).toBe(false);
  });
});
