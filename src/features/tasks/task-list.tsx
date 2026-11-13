import { ArrowDown, ArrowUp } from "lucide-react";
import { useState } from "react";
import { Avatar, Badge, ProgressBar } from "@/components/common/primitives";
import type { Project, Task, User } from "@/types";
import { cn } from "@/utils/cn";
import { fmtDate } from "@/utils/dates";
import { priorityLabel, priorityTone, taskStatusLabel, taskStatusTone } from "@/utils/labels";
import { isOverdue, sortTasks, type SortKey } from "./task-utils";

const cols: [string, SortKey | null][] = [["Task", "title"], ["Project", null], ["Assignee", null], ["Status", "status"], ["Priority", "priority"], ["Deadline", "dueDate"], ["Progress", "progress"]];

export function TaskList({ tasks, users, projects, onOpen }: { tasks: Task[]; users: User[]; projects: Project[]; onOpen: (id: string) => void }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "dueDate", dir: 1 });
  const rows = sortTasks(tasks, sort.key, sort.dir);
  return (
    <div className="overflow-x-auto rounded-lg border bg-background">
      <table className="w-full min-w-[760px] text-left">
        <thead className="border-b text-xs text-muted-foreground">
          <tr>
            {cols.map(([label, key]) => (
              <th key={label} className="px-3 py-2 font-medium" aria-sort={key && sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : undefined}>
                {key ? (
                  <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === 1 ? -1 : 1 }))}>
                    {label}{sort.key === key && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                  </button>
                ) : label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => {
            const owner = users.find((u) => u.id === t.assigneeId);
            return (
              <tr key={t.id} tabIndex={0} onClick={() => onOpen(t.id)} onKeyDown={(e) => e.key === "Enter" && onOpen(t.id)} className="cursor-pointer border-b last:border-0 hover:bg-accent/50">
                <td className="px-3 py-2 font-medium">{t.title}</td>
                <td className="px-3 py-2 text-muted-foreground">{projects.find((p) => p.id === t.projectId)?.code}</td>
                <td className="px-3 py-2">{owner ? <span className="flex items-center gap-2"><Avatar name={owner.name} />{owner.name}</span> : <span className="text-muted-foreground">Unassigned</span>}</td>
                <td className="px-3 py-2"><Badge tone={taskStatusTone[t.status]}>{taskStatusLabel[t.status]}</Badge></td>
                <td className="px-3 py-2"><Badge tone={priorityTone[t.priority]}>{priorityLabel[t.priority]}</Badge></td>
                <td className={cn("px-3 py-2", isOverdue(t) && "text-status-danger")}>{fmtDate(t.dueDate)}</td>
                <td className="w-32 px-3 py-2"><div className="flex items-center gap-2"><ProgressBar value={t.progress} /><span className="w-8 text-xs text-muted-foreground">{t.progress}%</span></div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
