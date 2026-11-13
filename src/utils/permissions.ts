import type { Role } from "@/types";

export type Action = "project.create" | "project.edit" | "project.archive" | "project.members" | "board.edit" | "map.edit" | "task.edit";

const matrix: Record<Action, Role[]> = {
  "project.create": ["owner", "editor"],
  "project.edit": ["owner", "editor"],
  "project.archive": ["owner"],
  "project.members": ["owner"],
  "board.edit": ["owner", "editor"],
  "map.edit": ["owner", "editor"],
  "task.edit": ["owner", "editor"],
};

/** UI-level gating only. The backend remains the authority on permissions. */
export const can = (role: Role, action: Action) => matrix[action].includes(role);
