import { useState } from "react";
import { Avatar, Badge, ProgressBar } from "@/components/common/primitives";
import type { Project, Task, TaskStatus, User } from "@/types";
import { cn } from "@/utils/cn";
import { fmtDate } from "@/utils/dates";
import { priorityLabel, priorityTone, taskStatusLabel } from "@/utils/labels";
import { groupByStatus, isOverdue, statusPatch } from "./task-utils";

interface Props {
  tasks: Task[];
  statuses: TaskStatus[];
  users: User[];
  projects: Project[];
  showProject: boolean;
  canEdit: boolean;
  onOpen: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
}

export function KanbanBoard({ tasks, statuses, users, projects, showProject, canEdit, onOpen, onUpdate }: Props) {
  const [over, setOver] = useState<TaskStatus | null>(null);
  const groups = groupByStatus(tasks, statuses);
  const move = (id: string, status: TaskStatus) => {
    const t = tasks.find((x) => x.id === id);
    if (t && t.status !== status) onUpdate(id, statusPatch(t, status));
  };
  return (
    <div className="grid auto-cols-[minmax(250px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
      {statuses.map((status) => (
        <section key={status} aria-label={taskStatusLabel[status]}
          onDragOver={(e) => { if (canEdit) { e.preventDefault(); setOver(status); } }}
          onDragLeave={() => setOver((o) => (o === status ? null : o))}
          onDrop={(e) => { e.preventDefault(); setOver(null); if (canEdit) move(e.dataTransfer.getData("text/plain"), status); }}
          className={cn("flex min-h-40 flex-col rounded-lg border bg-muted/40 p-2", over === status && "ring-2 ring-primary")}>
          <h3 className="mb-2 flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">{taskStatusLabel[status]}<span className="rounded bg-background px-1.5">{groups[status].length}</span></h3>
          <ul className="space-y-2">
            {groups[status].map((t) => {
              const owner = users.find((u) => u.id === t.assigneeId);
              return (
                <li key={t.id}>
                  <div role="button" tabIndex={0} draggable={canEdit} onClick={() => onOpen(t.id)} onKeyDown={(e) => e.key === "Enter" && onOpen(t.id)}
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", t.id); e.dataTransfer.effectAllowed = "move"; }}
                    className={cn("space-y-2 rounded-md border bg-background p-2.5 shadow-sm hover:border-primary/50", canEdit && "cursor-grab active:cursor-grabbing")}>
                    <p className="text-sm font-medium">{t.title}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={priorityTone[t.priority]}>{priorityLabel[t.priority]}</Badge>
                      {showProject && <span className="text-xs text-muted-foreground">{projects.find((p) => p.id === t.projectId)?.code}</span>}
                      <span className={cn("text-xs", isOverdue(t) ? "text-status-danger" : "text-muted-foreground")}>{fmtDate(t.dueDate)}</span>
                      {owner && <span className="ml-auto"><Avatar name={owner.name} /></span>}
                    </div>
                    <ProgressBar value={t.progress} />
                    {canEdit && (
                      <select aria-label={`Move ${t.title} to`} value={t.status} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}
                        onChange={(e) => move(t.id, e.target.value as TaskStatus)} className="h-6 w-full rounded border bg-background px-1 text-xs text-muted-foreground">
                        {Object.entries(taskStatusLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
