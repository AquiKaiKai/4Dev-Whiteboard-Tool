import type { ProjectInput } from "@/schemas/project";
import type { Activity, Board, BoardSummary, DevMap, DevMapSummary, Project, Task, User } from "@/types";

export class NotFoundError extends Error {
  constructor(what = "Item") {
    super(`${what} was not found.`);
  }
}
/** Thrown when the version sent with a write is older than the server's current version. */
export class ConflictError extends Error {
  constructor() {
    super("This item was changed by someone else. Reload to see the latest version.");
  }
}

export interface ProjectsApi {
  list(): Promise<Project[]>;
  get(id: string): Promise<Project>;
  create(input: ProjectInput): Promise<Project>;
  update(id: string, patch: Partial<ProjectInput>, version: number): Promise<Project>;
  archive(id: string, version: number): Promise<Project>;
  setMembers(id: string, memberIds: string[], version: number): Promise<Project>;
}
export interface UsersApi {
  list(): Promise<User[]>;
}
export type TaskPatch = Partial<Omit<Task, "id" | "projectId" | "version">>;
export interface TaskInput {
  projectId: string;
  title: string;
  assigneeId: string | null;
  status: Task["status"];
  priority: Task["priority"];
  dueDate: string;
}
export interface TasksApi {
  list(filter?: { projectId?: string }): Promise<Task[]>;
  create(input: TaskInput): Promise<Task>;
  /** Rejects with ConflictError when `version` is older than the stored version. */
  update(id: string, patch: TaskPatch, version: number): Promise<Task>;
}
export interface ActivityApi {
  list(limit?: number): Promise<Activity[]>;
}
export interface BoardsApi {
  list(opts?: { projectId?: string; trashed?: boolean }): Promise<BoardSummary[]>;
  get(id: string): Promise<Board>;
  create(projectId: string, name: string): Promise<BoardSummary>;
  rename(id: string, name: string, version: number): Promise<BoardSummary>;
  duplicate(id: string): Promise<BoardSummary>;
  saveDocument(id: string, document: string, version: number): Promise<BoardSummary>;
  trash(id: string): Promise<BoardSummary>;
  restore(id: string): Promise<BoardSummary>;
}
export interface DevMapApi {
  list(): Promise<DevMapSummary[]>;
  get(projectId: string): Promise<DevMap>;
  /** Saves the whole map. The backend may later add incremental node/edge endpoints. */
  save(projectId: string, doc: Pick<DevMap, "nodes" | "groups" | "edges">, version: number): Promise<{ version: number; updatedAt: string }>;
}
export interface Api {
  maps: DevMapApi;
  boards: BoardsApi;
  projects: ProjectsApi;
  users: UsersApi;
  tasks: TasksApi;
  activity: ActivityApi;
}
