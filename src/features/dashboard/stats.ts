import type { Project, Task, User } from "@/types";
import { todayISO } from "@/utils/dates";

const closed = ["completed", "cancelled"];

export function computeStats(projects: Project[], tasks: Task[], today = new Date()) {
  const live = projects.filter((p) => p.status !== "archived");
  const now = todayISO(today);
  return {
    totalProjects: live.length,
    activeProjects: live.filter((p) => p.status === "active").length,
    completedProjects: live.filter((p) => p.status === "completed").length,
    pendingTasks: tasks.filter((t) => t.status === "backlog" || t.status === "todo").length,
    inProgressTasks: tasks.filter((t) => ["in_progress", "in_review", "testing"].includes(t.status)).length,
    overdueTasks: tasks.filter((t) => !closed.includes(t.status) && t.dueDate < now).length,
  };
}

export const upcomingDeadlines = (tasks: Task[], today = new Date(), limit = 5) =>
  tasks
    .filter((t) => !closed.includes(t.status) && t.dueDate >= todayISO(today))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, limit);

export const workloadByUser = (users: User[], tasks: Task[]) =>
  users.map((user) => ({
    user,
    open: tasks.filter((t) => t.assigneeId === user.id && !closed.includes(t.status)).length,
    completed: tasks.filter((t) => t.assigneeId === user.id && t.status === "completed").length,
  }));
