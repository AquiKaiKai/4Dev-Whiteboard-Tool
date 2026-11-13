import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120, "Keep the title under 120 characters"),
  projectId: z.string().min(1, "Choose a project"),
  assigneeId: z.string(),
  status: z.enum(["backlog", "todo", "in_progress", "in_review", "testing", "blocked", "completed", "cancelled"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  dueDate: z.string().min(1, "Set a deadline"),
});
export type TaskFormValues = z.infer<typeof taskSchema>;
