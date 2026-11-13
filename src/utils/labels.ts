import type { Availability, Priority, ProjectStatus, Role, TaskStatus } from "@/types";

export type Tone = "neutral" | "blue" | "green" | "amber" | "red";

export const statusLabel: Record<ProjectStatus, string> = {
  planning: "Planning", active: "Active", on_hold: "On hold", completed: "Completed", archived: "Archived",
};
export const statusTone: Record<ProjectStatus, Tone> = {
  planning: "neutral", active: "blue", on_hold: "amber", completed: "green", archived: "neutral",
};
export const priorityLabel: Record<Priority, string> = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };
export const priorityTone: Record<Priority, Tone> = { low: "neutral", medium: "neutral", high: "amber", urgent: "red" };
export const availabilityLabel: Record<Availability, string> = { available: "Available", busy: "Busy", away: "Away" };
export const availabilityTone: Record<Availability, Tone> = { available: "green", busy: "amber", away: "neutral" };
export const roleLabel: Record<Role, string> = { owner: "Owner", editor: "Editor", viewer: "Viewer" };

export const taskStatusLabel: Record<TaskStatus, string> = {
  backlog: "Backlog", todo: "To do", in_progress: "In progress", in_review: "In review",
  testing: "Testing", blocked: "Blocked", completed: "Completed", cancelled: "Cancelled",
};
export const taskStatusTone: Record<TaskStatus, Tone> = {
  backlog: "neutral", todo: "neutral", in_progress: "blue", in_review: "blue",
  testing: "amber", blocked: "red", completed: "green", cancelled: "neutral",
};
