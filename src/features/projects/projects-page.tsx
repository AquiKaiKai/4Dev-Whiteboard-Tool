import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "@/components/common/modal";
import { Avatar, Badge, Card, MockNotice, ProgressBar, QueryState, inputCls } from "@/components/common/primitives";
import { Button } from "@/components/ui/button";
import { useUsers } from "@/features/team/queries";
import { usePermissions } from "@/hooks/use-permissions";
import { fmtDate } from "@/utils/dates";
import { priorityLabel, priorityTone, statusLabel, statusTone } from "@/utils/labels";
import { ProjectForm } from "./project-form";
import { useProjects } from "./queries";

export function ProjectsPage() {
  const projects = useProjects();
  const users = useUsers();
  const allowed = usePermissions();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const [archived, setArchived] = useState(false);
  const name = (id: string) => users.data?.find((u) => u.id === id)?.name ?? id;

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto"><h2 className="text-lg font-semibold">Projects</h2><MockNotice /></div>
        <input className={`${inputCls} w-56`} placeholder="Filter projects" aria-label="Filter projects" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} /> Show archived</label>
        {allowed("project.create") && <Button onClick={() => setCreating(true)}><Plus className="h-4 w-4" /> New project</Button>}
      </div>
      <Card className="overflow-x-auto">
        <QueryState query={projects} emptyText="No projects yet." isEmpty={(d) => d.length === 0}>
          {(data) => {
            const rows = data.filter((p) => (archived || p.status !== "archived") && `${p.name} ${p.code}`.toLowerCase().includes(q.toLowerCase()));
            if (!rows.length) return <p className="p-6 text-muted-foreground">No projects match your filter.</p>;
            return (
              <table className="w-full min-w-[720px] text-left">
                <thead className="border-b text-xs text-muted-foreground">
                  <tr>{["Project", "Status", "Priority", "Owner", "Members", "Target", "Progress"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} tabIndex={0} onClick={() => navigate(`/projects/${p.id}`)} onKeyDown={(e) => e.key === "Enter" && navigate(`/projects/${p.id}`)} className="cursor-pointer border-b last:border-0 hover:bg-accent/50">
                      <td className="px-3 py-2"><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.code}</div></td>
                      <td className="px-3 py-2"><Badge tone={statusTone[p.status]}>{statusLabel[p.status]}</Badge></td>
                      <td className="px-3 py-2"><Badge tone={priorityTone[p.priority]}>{priorityLabel[p.priority]}</Badge></td>
                      <td className="px-3 py-2">{name(p.ownerId)}</td>
                      <td className="px-3 py-2"><div className="flex -space-x-1.5">{p.memberIds.map((id) => <Avatar key={id} name={name(id)} />)}</div></td>
                      <td className="px-3 py-2">{fmtDate(p.targetDate)}</td>
                      <td className="w-36 px-3 py-2"><div className="flex items-center gap-2"><ProgressBar value={p.progress} /><span className="w-8 text-xs text-muted-foreground">{p.progress}%</span></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          }}
        </QueryState>
      </Card>
      {creating && <Modal title="New project" onClose={() => setCreating(false)}><ProjectForm onDone={() => setCreating(false)} /></Modal>}
    </div>
  );
}
