import { KanbanSquare, List, Plus } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MockNotice, QueryState, inputCls } from "@/components/common/primitives";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/features/projects/queries";
import { useUsers } from "@/features/team/queries";
import { usePermissions } from "@/hooks/use-permissions";
import { useSessionStore } from "@/stores/session-store";
import { priorityLabel } from "@/utils/labels";
import { KanbanBoard } from "./kanban-board";
import { NewTaskDialog } from "./new-task-dialog";
import { TaskList } from "./task-list";
import { TaskPanel } from "./task-panel";
import { extraColumns, filterTasks, kanbanColumns, noTaskFilters } from "./task-utils";
import { useTasks, useUpdateTask } from "./queries";

/** One view for both "My tasks" (mine) and a project's Tasks tab (projectId). Same shared task records either way. */
export function TasksView({ projectId, mine = false }: { projectId?: string; mine?: boolean }) {
  const tasks = useTasks(projectId);
  const users = useUsers();
  const projects = useProjects();
  const me = useSessionStore((s) => s.userId);
  const canEdit = usePermissions()("task.edit");
  const update = useUpdateTask();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [filters, setFilters] = useState(noTaskFilters);
  const [extra, setExtra] = useState(false);
  const [creating, setCreating] = useState(false);
  const openId = params.get("task");
  const open = (id: string | null) => setParams((p) => { const n = new URLSearchParams(p); if (id) n.set("task", id); else n.delete("task"); return n; }, { replace: true });
  const set = (p: Partial<typeof filters>) => setFilters((f) => ({ ...f, ...p }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto">{mine && <h2 className="text-lg font-semibold">My tasks</h2>}<MockNotice /></div>
        <input type="search" aria-label="Search tasks" placeholder="Search tasks" className={`${inputCls} w-44`} value={filters.query} onChange={(e) => set({ query: e.target.value })} />
        {!mine && (
          <select aria-label="Filter by assignee" className={`${inputCls} w-36`} value={filters.assigneeId} onChange={(e) => set({ assigneeId: e.target.value })}>
            <option value="">All assignees</option><option value="unassigned">Unassigned</option>{users.data?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
        <select aria-label="Filter by priority" className={`${inputCls} w-32`} value={filters.priority} onChange={(e) => set({ priority: e.target.value })}>
          <option value="">All priorities</option>{Object.entries(priorityLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <div role="group" aria-label="View" className="flex rounded-md border">
          <Button variant={view === "kanban" ? "default" : "ghost"} size="sm" aria-pressed={view === "kanban"} onClick={() => setView("kanban")}><KanbanSquare className="h-4 w-4" /> Kanban</Button>
          <Button variant={view === "list" ? "default" : "ghost"} size="sm" aria-pressed={view === "list"} onClick={() => setView("list")}><List className="h-4 w-4" /> List</Button>
        </div>
        {canEdit && <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New task</Button>}
      </div>
      {update.isError && <p role="alert" className="text-sm text-destructive">{update.error.message} The latest saved version has been reloaded.</p>}

      <QueryState query={tasks} isEmpty={(d) => d.length === 0} emptyText="No tasks yet.">
        {(all) => {
          const scoped = mine ? all.filter((t) => t.assigneeId === me) : all;
          const shown = filterTasks(scoped, filters);
          const hidden = scoped.filter((t) => extraColumns.includes(t.status)).length;
          const selected = all.find((t) => t.id === openId);
          const onUpdate = (id: string, patch: Parameters<typeof update.mutate>[0]["patch"]) => update.mutate({ id, patch });
          return (
            <>
              {view === "kanban" && (
                <>
                  <label className="flex items-center gap-1.5 text-sm text-muted-foreground"><input type="checkbox" checked={extra} onChange={(e) => setExtra(e.target.checked)} /> Show blocked and cancelled columns{hidden > 0 && !extra ? ` (${hidden} hidden)` : ""}</label>
                  <KanbanBoard tasks={shown} statuses={extra ? [...kanbanColumns, ...extraColumns] : kanbanColumns} users={users.data ?? []} projects={projects.data ?? []} showProject={!projectId} canEdit={canEdit} onOpen={open} onUpdate={onUpdate} />
                </>
              )}
              {view === "list" && (shown.length ? <TaskList tasks={shown} users={users.data ?? []} projects={projects.data ?? []} onOpen={open} /> : <p className="p-6 text-muted-foreground">{mine ? "Nothing is assigned to you." : "No tasks match your filters."}</p>)}
              {selected && <TaskPanel key={selected.id} task={selected} users={users.data ?? []} canEdit={canEdit} onUpdate={(patch) => onUpdate(selected.id, patch)} onClose={() => open(null)} />}
            </>
          );
        }}
      </QueryState>
      {creating && <NewTaskDialog projectId={projectId} defaultAssigneeId={mine ? me : undefined} onClose={() => setCreating(false)} onCreated={open} />}
    </div>
  );
}
