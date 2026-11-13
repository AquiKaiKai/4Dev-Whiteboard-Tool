import { z } from "zod";

export const projectSchema = z
  .object({
    name: z.string().trim().min(3, "Name must be at least 3 characters").max(80, "Keep the name under 80 characters"),
    description: z.string().trim().max(500, "Keep the description under 500 characters"),
    ownerId: z.string().min(1, "Choose an owner"),
    memberIds: z.array(z.string()),
    status: z.enum(["planning", "active", "on_hold", "completed"]),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    startDate: z.string().min(1, "Set a start date"),
    targetDate: z.string().min(1, "Set a target date"),
  })
  .refine((v) => v.targetDate >= v.startDate, {
    message: "Target date must be on or after the start date",
    path: ["targetDate"],
  });

export type ProjectInput = z.infer<typeof projectSchema>;
