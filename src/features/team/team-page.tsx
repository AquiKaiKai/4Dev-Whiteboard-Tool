import { useState } from "react";
import { Avatar, Badge, Card, MockNotice, ProgressBar } from "@/components/common/primitives";
import { useProjects } from "@/features/projects/queries";
import { useTasks } from "@/features/tasks/queries";
import { availabilityLabel, availabilityTone } from "@/utils/labels";
import { useUsers } from "./queries";

const CAPACITY = 6; // open tasks treated as a full workload (mock assumption)

export function TeamPage() {
  const users = useUsers();
  const projects = useProjects();
  const tasks = useTasks();
  const [selected, setSelected] = useState<string | null>(null);

  if (users.isError || projects.isError || tasks.isError)
    return <p role="alert" className="p-6 text-destructive">Could not load the team. Please try again.</p>;
  if (!users.data || !projects.data || !tasks.data) return <p role="status" className="p-6 text-muted-foreground">Loading...</p>;

  const open = (id: string) => tasks.data.filter((t) => t.assigneeId === id && !["completed", "cancelled"].includes(t.status));
  const sel = users.data.find((u) => u.id === selected);

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div><h2 className="text-lg font-semibold">Team</h2><MockNotice /></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {users.data.map((u) => {
          const mine = open(u.id);
          const done = tasks.data.filter((t) => t.assigneeId === u.id && t.status === "completed").length;
          const pct = Math.min(100, Math.round((mine.length / CAPACITY) * 100));
          return (
            <button key={u.id} onClick={() => setSelected(selected === u.id ? null : u.id)} aria-pressed={selected === u.id} className="text-left">
              <Card className={`space-y-3 p-4 hover:bg-accent/50 ${selected === u.id ? "ring-2 ring-primary" : ""}`}>
                <div className="flex items-center gap-3">
                  <Avatar name={u.name} className="h-9 w-9 text-xs" />
                  <div className="mr-auto"><p className="font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.title}</p></div>
                  <Badge tone={availabilityTone[u.availability]}>{availabilityLabel[u.availability]}</Badge>
                </div>
                <div className="grid grid-cols-3 text-center text-xs text-muted-foreground">
                  <div><p className="text-base font-semibold text-foreground">{projects.data.filter((p) => p.memberIds.includes(u.id) && p.status !== "archived").length}</p>Projects</div>
                  <div><p className="text-base font-semibold text-foreground">{mine.length}</p>Active</div>
                  <div><p className="text-base font-semibold text-foreground">{done}</p>Completed</div>
                </div>
                <div><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Workload</span><span>{pct}%</span></div><ProgressBar value={pct} /></div>
              </Card>
            </button>
          );
        })}
      </div>
      {sel && (
        <Card className="p-4">
          <h3 className="mb-2 font-medium">{sel.name}'s assignments</h3>
          {open(sel.id).length === 0 ? <p className="text-muted-foreground">No active tasks.</p> : (
            <ul className="divide-y">
              {open(sel.id).map((t) => (
                <li key={t.id} className="flex items-center gap-2 py-2"><span className="mr-auto">{t.title}</span><span className="text-xs text-muted-foreground">{projects.data.find((p) => p.id === t.projectId)?.code}</span></li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
