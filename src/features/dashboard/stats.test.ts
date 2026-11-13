import type { Project, Task } from "@/types";
import { computeStats, upcomingDeadlines } from "./stats";

const today = new Date("2026-11-10T08:00:00");
const proj = (status: Project["status"]) => ({ status }) as Project;
const task = (id: string, status: Task["status"], dueDate: string) => ({ id, status, dueDate }) as Task;

describe("computeStats", () => {
  it("excludes archived projects and counts overdue open tasks only", () => {
    const s = computeStats(
      [proj("active"), proj("completed"), proj("archived")],
      [task("1", "todo", "2026-11-01"), task("2", "completed", "2026-11-01"), task("3", "in_progress", "2026-11-20"), task("4", "backlog", "2026-12-01")],
      today,
    );
    expect(s).toMatchObject({ totalProjects: 2, activeProjects: 1, completedProjects: 1, pendingTasks: 2, inProgressTasks: 1, overdueTasks: 1 });
  });
  it("sorts upcoming deadlines and skips finished or past tasks", () => {
    const list = upcomingDeadlines([task("a", "todo", "2026-11-20"), task("b", "todo", "2026-11-12"), task("c", "completed", "2026-11-11"), task("d", "todo", "2026-11-01")], today);
    expect(list.map((t) => t.id)).toEqual(["b", "a"]);
  });
});
