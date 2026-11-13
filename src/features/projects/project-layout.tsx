import { CheckCircle2, Circle } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useOutletContext, useParams } from "react-router-dom";
import { Modal } from "@/components/common/modal";
import { Avatar, Badge, Card, ProgressBar, QueryState, inputCls } from "@/components/common/primitives";
import { Button } from "@/components/ui/button";
import { useUsers } from "@/features/team/queries";
import { usePermissions } from "@/hooks/use-permissions";
import type { Project } from "@/types";
import { cn } from "@/utils/cn";
import { fmtDate } from "@/utils/dates";
import { priorityLabel, priorityTone, statusLabel, statusTone } from "@/utils/labels";
import { ProjectForm } from "./project-form";
import { useArchiveProject, useProject, useSetMembers } from "./queries";

const tabs = [
  ["", "Overview"], ["boards", "Boards"], ["map", "Development map"], ["tasks", "Tasks"], ["timeline", "Timeline"], ["analytics", "Analytics"],
] as const;

export function ProjectLayout() {
  const { projectId } = useParams();
  const query = useProject(projectId);
  const allowed = usePermissions();
  const archive = useArchiveProject();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <QueryState query={query}>
      {(p) => (
        <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
          <div className="flex flex-wrap items-start gap-3">
            <div className="mr-auto">
              <p className="text-xs text-muted-foreground">{p.code}</p>
              <h2 className="text-lg font-semibold">{p.name}</h2>
              <div className="mt-1 flex gap-1.5"><Badge tone={statusTone[p.status]}>{statusLabel[p.status]}</Badge><Badge tone={priorityTone[p.priority]}>{priorityLabel[p.priority]}</Badge></div>
            </div>
            {p.status !== "archived" && allowed("project.edit") && <Button variant="outline" onClick={() => setEditing(true)}>Edit</Button>}
            {p.status !== "archived" && allowed("project.archive") && (confirming ? (
              <>
                <Button variant="destructive" disabled={archive.isPending} onClick={() => archive.mutate({ id: p.id, version: p.version }, { onSuccess: () => { setConfirming(false); void query.refetch(); } })}>Confirm archive</Button>
                <Button variant="ghost" onClick={() => setConfirming(false)}>Cancel</Button>
              </>
            ) : <Button variant="outline" onClick={() => setConfirming(true)}>Archive</Button>)}
          </div>
          {archive.isError && <p role="alert" className="text-sm text-destructive">{archive.error.message}</p>}
          <nav className="flex gap-1 overflow-x-auto border-b" aria-label="Project sections">
            {tabs.map(([to, label]) => (
              <NavLink key={label} to={to} end={to === ""} className={({ isActive }) => cn("whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-muted-foreground hover:text-foreground", isActive && "border-primary text-foreground")}>{label}</NavLink>
            ))}
          </nav>
          <Outlet context={{ project: p }} />
          {editing && <Modal title="Edit project" onClose={() => { setEditing(false); void query.refetch(); }}><ProjectForm project={p} onDone={() => { setEditing(false); void query.refetch(); }} /></Modal>}
        </div>
      )}
    </QueryState>
  );
}

export function ProjectOverview() {
  const { project: p } = useOutletContext<{ project: Project }>();
  const users = useUsers();
  const setMembers = useSetMembers();
  const { refetch } = useProject(p.id);
  const allowed = usePermissions();
  const canManage = allowed("project.members") && p.status !== "archived";
  const name = (id: string) => users.data?.find((u) => u.id === id)?.name ?? id;
  const save = (memberIds: string[]) => setMembers.mutate({ id: p.id, memberIds, version: p.version }, { onSuccess: () => void refetch() });
  const candidates = users.data?.filter((u) => !p.memberIds.includes(u.id)) ?? [];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card className="space-y-3 p-4">
          <p>{p.description || <span className="text-muted-foreground">No description.</span>}</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">Start</p>{fmtDate(p.startDate)}</div>
            <div><p className="text-xs text-muted-foreground">Target</p>{fmtDate(p.targetDate)}</div>
            <div><p className="text-xs text-muted-foreground">Owner</p>{name(p.ownerId)}</div>
          </div>
          <div><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Overall progress</span><span>{p.progress}%</span></div><ProgressBar value={p.progress} /></div>
        </Card>
        <Card className="p-4">
          <h3 className="mb-2 font-medium">Milestones</h3>
          {p.milestones.length === 0 ? <p className="text-muted-foreground">No milestones yet.</p> : (
            <ul className="space-y-2">
              {p.milestones.map((m) => (
                <li key={m.id} className="flex items-center gap-2">
                  {m.done ? <CheckCircle2 className="h-4 w-4 text-status-success" aria-label="Done" /> : <Circle className="h-4 w-4 text-muted-foreground" aria-label="Open" />}
                  <span className="mr-auto">{m.title}</span><span className="text-xs text-muted-foreground">{fmtDate(m.dueDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card className="h-fit space-y-3 p-4">
        <h3 className="font-medium">Members</h3>
        <ul className="space-y-2">
          {p.memberIds.map((id) => (
            <li key={id} className="flex items-center gap-2">
              <Avatar name={name(id)} /><span className="mr-auto">{name(id)}</span>
              {id === p.ownerId ? <Badge tone="blue">Owner</Badge> : canManage && <Button size="sm" variant="ghost" onClick={() => save(p.memberIds.filter((m) => m !== id))}>Remove</Button>}
            </li>
          ))}
        </ul>
        {canManage && candidates.length > 0 && (
          <select aria-label="Add member" className={inputCls} value="" onChange={(e) => e.target.value && save([...p.memberIds, e.target.value])}>
            <option value="">Add member...</option>
            {candidates.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
        {setMembers.isError && <p role="alert" className="text-sm text-destructive">{setMembers.error.message}</p>}
      </Card>
    </div>
  );
}
