import { addDays, formatISO } from "date-fns";
import type { Activity, Board, BoardSummary, DevEdge, DevMap, DevNode, EdgeKind, NodeType, Priority, Project, Task, TaskStatus, User } from "@/types";
import { ConflictError, NotFoundError, type Api } from "../api/types";

/** In-memory demo data. Nothing here is persisted; it resets on reload. */
const day = (n: number) => formatISO(addDays(new Date(), n), { representation: "date" });
const stamp = (n: number) => addDays(new Date(), n).toISOString();

let latency = 250;
export const setMockLatency = (ms: number) => { latency = ms; };
const respond = <T,>(value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(structuredClone(value)), latency));

const users: User[] = [
  { id: "u1", name: "Jander Juan", email: "aqui@4dev.studio", title: "Founder & Lead Engineer", availability: "busy" },
  { id: "u2", name: "Kate Margareth", email: "mika@4dev.studio", title: "Frontend Engineer", availability: "available" },
  { id: "u3", name: "Czed Ancheta", email: "joaquin@4dev.studio", title: "Backend Engineer", availability: "busy" },
  { id: "u4", name: "Elle Alisa", email: "bea@4dev.studio", title: "UI/UX Designer", availability: "available" },
  { id: "u5", name: "Judel Federigan", email: "carlo@4dev.studio", title: "Full-stack Engineer", availability: "away" },
  { id: "u6", name: "Jeanelle Carganilla", email: "lia@4dev.studio", title: "QA Engineer", availability: "available" },
];

const projects: Project[] = [
  { id: "p1", code: "DEV-101", name: "Client Portal Redesign", description: "Redesign the customer portal with a new navigation model and a faster dashboard.", ownerId: "u1", memberIds: ["u1", "u2", "u4"], status: "active", priority: "high", startDate: day(-40), targetDate: day(20), progress: 68, version: 3, updatedAt: stamp(-1),
    milestones: [{ id: "m1", title: "Design sign-off", dueDate: day(-20), done: true }, { id: "m2", title: "Beta release", dueDate: day(8), done: false }, { id: "m3", title: "Launch", dueDate: day(20), done: false }] },
  { id: "p2", code: "DEV-102", name: "Internal Workspace Tool", description: "Whiteboard and development tracker for the studio.", ownerId: "u1", memberIds: ["u1", "u2", "u3", "u5"], status: "active", priority: "urgent", startDate: day(-25), targetDate: day(60), progress: 22, version: 5, updatedAt: stamp(0),
    milestones: [{ id: "m4", title: "Shell and dashboard", dueDate: day(5), done: false }, { id: "m5", title: "Whiteboard MVP", dueDate: day(30), done: false }] },
  { id: "p3", code: "DEV-103", name: "Booking Platform", description: "Reservation and payment flows for a hospitality client.", ownerId: "u3", memberIds: ["u3", "u5", "u6"], status: "planning", priority: "medium", startDate: day(5), targetDate: day(90), progress: 5, version: 1, updatedAt: stamp(-3),
    milestones: [{ id: "m6", title: "Requirements approved", dueDate: day(12), done: false }] },
  { id: "p4", code: "DEV-104", name: "Design System Library", description: "Shared component library and tokens for client work.", ownerId: "u2", memberIds: ["u2", "u4"], status: "completed", priority: "low", startDate: day(-90), targetDate: day(-10), progress: 100, version: 8, updatedAt: stamp(-9),
    milestones: [{ id: "m7", title: "v1.0 published", dueDate: day(-10), done: true }] },
  { id: "p5", code: "DEV-105", name: "Mobile Companion App", description: "Lightweight companion app, paused pending client budget.", ownerId: "u1", memberIds: ["u1", "u5"], status: "on_hold", priority: "medium", startDate: day(-60), targetDate: day(45), progress: 35, version: 4, updatedAt: stamp(-14), milestones: [] },
];

const t = (id: number, projectId: string, title: string, assigneeId: string | null, status: TaskStatus, priority: Priority, due: number, progress: number): Task =>
  ({ id: `t${id}`, projectId, title, description: "", labels: [], subtasks: [], checklist: [], comments: [], assigneeId, status, priority, dueDate: day(due), progress, version: 1 });
const tasks: Task[] = [
  t(1, "p1", "Navigation prototype", "u4", "completed", "high", -18, 100),
  t(2, "p1", "Dashboard widgets", "u2", "in_progress", "high", 4, 60),
  t(3, "p1", "Accessibility audit", "u6", "todo", "medium", 9, 0),
  t(4, "p1", "Fix table overflow on mobile", "u2", "in_review", "low", -2, 90),
  t(5, "p2", "App shell and routing", "u1", "completed", "urgent", -3, 100),
  t(6, "p2", "Project list and forms", "u2", "in_progress", "high", 3, 45),
  t(7, "p2", "Define API contracts", "u3", "in_progress", "urgent", 2, 50),
  t(8, "p2", "Whiteboard canvas spike", "u5", "todo", "high", 14, 0),
  t(9, "p2", "Auth integration plan", "u3", "blocked", "medium", -1, 20),
  t(10, "p3", "Payment provider comparison", "u5", "backlog", "medium", 15, 0),
  t(11, "p3", "Data model draft", "u3", "todo", "high", 7, 10),
  t(12, "p3", "Test plan", "u6", "backlog", "low", 25, 0),
  t(13, "p4", "Publish package", "u2", "completed", "low", -12, 100),
  t(14, "p5", "Push notification research", "u5", "testing", "low", 6, 80),
  t(15, "p1", "Content migration script", null, "backlog", "medium", 12, 0),
];

const task = (id: string) => tasks.find((x) => x.id === id)!;
Object.assign(task("t6"), { description: "Build the project list, create/edit form and member assignment.", labels: ["frontend"], progress: 50,
  subtasks: [{ id: "s1", title: "Form validation", done: true }, { id: "s2", title: "Member assignment", done: true }, { id: "s3", title: "Archive flow", done: false }, { id: "s4", title: "Empty and error states", done: false }] });
Object.assign(task("t7"), { description: "Agree request and response shapes with the backend team.", labels: ["backend"], progress: 33,
  checklist: [{ id: "c1", text: "Projects and members", done: true }, { id: "c2", text: "Boards and nodes", done: false }, { id: "c3", text: "Auth and notifications", done: false }],
  comments: [{ id: "k1", authorId: "u3", text: "First draft of the board endpoints is ready for review.", at: stamp(-1) }] });
Object.assign(task("t9"), { description: "Blocked until the contract for authentication is agreed.", labels: ["backend"] });

const activity: Activity[] = [
  { id: "a1", actorId: "u2", projectId: "p2", message: "moved “Project list and forms” to In Progress", at: stamp(0) },
  { id: "a2", actorId: "u1", projectId: "p2", message: "completed “App shell and routing”", at: stamp(-0.1) },
  { id: "a3", actorId: "u3", projectId: "p2", message: "marked “Auth integration plan” as Blocked", at: stamp(-1) },
  { id: "a4", actorId: "u4", projectId: "p1", message: "completed “Navigation prototype”", at: stamp(-2) },
  { id: "a5", actorId: "u6", projectId: "p1", message: "was assigned “Accessibility audit”", at: stamp(-2.5) },
  { id: "a6", actorId: "u3", projectId: "p3", message: "created project Booking Platform", at: stamp(-3) },
];

const mkBoard = (id: string, projectId: string, name: string, ago: number): Board =>
  ({ id, projectId, name, document: null, version: 1, createdAt: stamp(-ago - 5), updatedAt: stamp(-ago), deletedAt: null });
const boards: Board[] = [
  mkBoard("b1", "p2", "System architecture", 1),
  mkBoard("b2", "p2", "Sprint planning", 3),
  mkBoard("b3", "p1", "Navigation flows", 6),
  mkBoard("b4", "p3", "Booking flow sketch", 2),
];
const summary = ({ document: _doc, ...rest }: Board): BoardSummary => rest;
let failNextSave = false;
/** Test/demo hook: makes the next mock board save fail so the "Save failed" UI can be exercised. */
export const failNextMockSave = () => { failNextSave = true; };
const findBoard = (id: string) => {
  const b = boards.find((x) => x.id === id);
  if (!b) throw new NotFoundError("Board");
  return b;
};
const touchBoard = (b: Board) => { b.version += 1; b.updatedAt = new Date().toISOString(); return summary(b); };

type NodeInit = Partial<Omit<DevNode, "position">> & { x: number; y: number };
const dn = (id: string, projectId: string, type: NodeType, title: string, { x, y, ...rest }: NodeInit): DevNode => ({
  id, projectId, type, title, description: "", status: "todo", priority: "medium", assigneeId: null, startDate: null, dueDate: null,
  progress: 0, labels: [], checklist: [], comments: [], attachments: [], activity: [], taskId: null, groupId: null,
  position: { x, y }, deletedAt: null, ...rest,
});
const de = (id: string, source: string, kind: EdgeKind, target: string): DevEdge => ({ id, source, target, kind });
const mkMap = (projectId: string, nodes: DevNode[], edges: DevEdge[]): DevMap =>
  ({ projectId, version: 1, nodes, groups: [], edges, updatedAt: stamp(-1) });
const maps = new Map<string, DevMap>([
  ["p2", mkMap("p2", [
    dn("n1", "p2", "project", "Internal Workspace Tool", { x: 0, y: 200, status: "in_progress", priority: "urgent", assigneeId: "u1", progress: 22, dueDate: day(60) }),
    dn("n2", "p2", "epic", "Foundation", { x: 320, y: 0, status: "completed", assigneeId: "u1", progress: 100 }),
    dn("n3", "p2", "epic", "Whiteboard", { x: 320, y: 200, status: "in_progress", assigneeId: "u5", progress: 35, dueDate: day(30) }),
    dn("n4", "p2", "epic", "Development map", { x: 320, y: 400, status: "todo", assigneeId: "u2" }),
    dn("n5", "p2", "feature", "App shell and routing", { x: 640, y: -60, status: "completed", assigneeId: "u1", progress: 100, taskId: "t5" }),
    dn("n6", "p2", "feature", "Project list and forms", { x: 640, y: 60, status: "in_progress", priority: "high", assigneeId: "u2", progress: 45, dueDate: day(3), taskId: "t6", labels: ["frontend"] }),
    dn("n7", "p2", "task", "Define API contracts", { x: 640, y: 200, status: "in_progress", priority: "urgent", assigneeId: "u3", progress: 33, dueDate: day(2), taskId: "t7", labels: ["backend"],
      checklist: [{ id: "c1", text: "Projects and members", done: true }, { id: "c2", text: "Boards and nodes", done: false }, { id: "c3", text: "Auth and notifications", done: false }] }),
    dn("n8", "p2", "task", "Auth integration plan", { x: 640, y: 340, status: "blocked", assigneeId: "u3", progress: 20, dueDate: day(-1), taskId: "t9", labels: ["backend"] }),
    dn("n9", "p2", "bug", "Dashboard tile wraps on narrow screens", { x: 640, y: 480, status: "todo", priority: "low", assigneeId: "u2", labels: ["frontend"] }),
    dn("n10", "p2", "milestone", "Whiteboard MVP", { x: 960, y: 200, status: "todo", priority: "high", dueDate: day(30) }),
    dn("n11", "p2", "decision", "Use snapshot undo for boards", { x: 960, y: 60, status: "completed", assigneeId: "u1", description: "Simple and reliable; revisit if boards get very large." }),
    dn("n12", "p2", "note", "Backend team to review API types before integration", { x: 960, y: 400, status: "backlog" }),
    dn("n13", "p2", "subtask", "Review attachment upload flow", { x: 960, y: 520, status: "backlog", assigneeId: "u5", attachments: [{ id: "a1", name: "upload-flow.pdf", size: 184320 }] }),
  ], [
    de("e1", "n1", "parent_of", "n2"), de("e2", "n1", "parent_of", "n3"), de("e3", "n1", "parent_of", "n4"),
    de("e4", "n2", "parent_of", "n5"), de("e5", "n2", "parent_of", "n6"), de("e6", "n2", "parent_of", "n7"), de("e7", "n2", "parent_of", "n8"),
    de("e8", "n8", "depends_on", "n7"), de("e9", "n6", "depends_on", "n7"), de("e10", "n10", "depends_on", "n3"),
    de("e11", "n9", "related", "n6"), de("e12", "n11", "related", "n3"), de("e13", "n7", "parent_of", "n13"),
  ])],
  ["p1", mkMap("p1", [
    dn("m1", "p1", "epic", "Navigation redesign", { x: 0, y: 100, status: "in_progress", assigneeId: "u4", progress: 70 }),
    dn("m2", "p1", "feature", "Navigation prototype", { x: 320, y: 0, status: "completed", assigneeId: "u4", progress: 100, taskId: "t1" }),
    dn("m3", "p1", "feature", "Dashboard widgets", { x: 320, y: 140, status: "in_progress", priority: "high", assigneeId: "u2", progress: 60, dueDate: day(4), taskId: "t2" }),
    dn("m4", "p1", "task", "Accessibility audit", { x: 640, y: 140, status: "todo", assigneeId: "u6", dueDate: day(9), taskId: "t3" }),
    dn("m5", "p1", "milestone", "Beta release", { x: 640, y: 0, status: "todo", priority: "high", dueDate: day(8) }),
  ], [de("f1", "m1", "parent_of", "m2"), de("f2", "m1", "parent_of", "m3"), de("f3", "m4", "depends_on", "m3"), de("f4", "m5", "depends_on", "m2")])],
]);

const find = (id: string) => {
  const p = projects.find((x) => x.id === id);
  if (!p) throw new NotFoundError("Project");
  return p;
};
const write = (id: string, version: number, apply: (p: Project) => void) => {
  const p = find(id);
  if (p.version !== version) throw new ConflictError();
  apply(p);
  p.version += 1;
  p.updatedAt = new Date().toISOString();
  return p;
};
const run = async <T,>(fn: () => T) => {
  await respond(null);
  return structuredClone(fn());
};

export const mockApi: Api = {
  maps: {
    list: () => respond([...maps.values()].map((m) => ({ projectId: m.projectId, nodeCount: m.nodes.filter((n) => !n.deletedAt).length, updatedAt: m.updatedAt }))),
    get: async (projectId) => respond(maps.get(projectId) ?? mkMap(projectId, [], [])),
    save: (projectId, doc, version) => run(() => {
      if (failNextSave) { failNextSave = false; throw new Error("The server could not save this map."); }
      const cur = maps.get(projectId) ?? mkMap(projectId, [], []);
      if (cur.version !== version) throw new ConflictError();
      const next = { ...cur, ...structuredClone(doc), version: cur.version + 1, updatedAt: new Date().toISOString() };
      maps.set(projectId, next);
      return { version: next.version, updatedAt: next.updatedAt };
    }),
  },
  boards: {
    list: (o) =>
      respond(boards.filter((b) => (!o?.projectId || b.projectId === o.projectId) && (o?.trashed ? b.deletedAt : !b.deletedAt)).map(summary)),
    get: async (id) => respond(findBoard(id)),
    create: (projectId, name) => run(() => {
      const b = mkBoard(`b${Date.now()}`, projectId, name, 0);
      boards.unshift(b);
      return summary(b);
    }),
    rename: (id, name, version) => run(() => {
      const b = findBoard(id);
      if (b.version !== version) throw new ConflictError();
      b.name = name;
      return touchBoard(b);
    }),
    duplicate: (id) => run(() => {
      const src = findBoard(id);
      const b = { ...mkBoard(`b${Date.now()}`, src.projectId, `${src.name} (copy)`, 0), document: src.document };
      boards.unshift(b);
      return summary(b);
    }),
    saveDocument: (id, document, version) => run(() => {
      if (failNextSave) { failNextSave = false; throw new Error("The server could not save this board."); }
      const b = findBoard(id);
      if (b.version !== version) throw new ConflictError();
      b.document = document;
      return touchBoard(b);
    }),
    trash: (id) => run(() => { const b = findBoard(id); b.deletedAt = new Date().toISOString(); return touchBoard(b); }),
    restore: (id) => run(() => { const b = findBoard(id); b.deletedAt = null; return touchBoard(b); }),
  },
  projects: {
    list: () => respond(projects),
    get: async (id) => respond(find(id)),
    create: (input) =>
      run(() => {
        const p: Project = {
          ...input, id: `p${Date.now()}`, code: `DEV-${101 + projects.length}`, progress: 0,
          milestones: [], version: 1, updatedAt: new Date().toISOString(),
        };
        projects.unshift(p);
        return p;
      }),
    update: (id, patch, version) => run(() => write(id, version, (p) => Object.assign(p, patch))),
    archive: (id, version) => run(() => write(id, version, (p) => { p.status = "archived"; })),
    setMembers: (id, memberIds, version) => run(() => write(id, version, (p) => { p.memberIds = memberIds; })),
  },
  users: { list: () => respond(users) },
  tasks: {
    list: (f) => respond(f?.projectId ? tasks.filter((x) => x.projectId === f.projectId) : tasks),
    create: (input) => run(() => {
      const t: Task = { ...input, id: `t${Date.now()}`, description: "", labels: [], subtasks: [], checklist: [], comments: [], progress: 0, version: 1 };
      tasks.unshift(t);
      return t;
    }),
    update: (id, patch, version) => run(() => {
      const t = tasks.find((x) => x.id === id);
      if (!t) throw new NotFoundError("Task");
      if (t.version !== version) throw new ConflictError();
      Object.assign(t, patch);
      t.version += 1;
      return t;
    }),
  },
  activity: { list: (limit = 10) => respond(activity.slice(0, limit)) },
};
