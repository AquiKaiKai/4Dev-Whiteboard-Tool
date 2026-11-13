import { X } from "lucide-react";
import { useState } from "react";
import { Avatar, Badge, inputCls } from "@/components/common/primitives";
import { Button } from "@/components/ui/button";
import { useTasks, useUpdateTask } from "@/features/tasks/queries";
import { statusPatch } from "@/features/tasks/task-utils";
import { useUsers } from "@/features/team/queries";
import type { DevNode, EdgeKind, NodeType, Priority, TaskStatus } from "@/types";
import { fmtDate } from "@/utils/dates";
import { priorityLabel, taskStatusLabel, taskStatusTone } from "@/utils/labels";
import { Link } from "react-router-dom";
import { applyTask } from "./graph";
import { edgeKinds, edgeKindLabel, nodeTypeMeta, nodeTypes, relationPhrase } from "./constants";
import { isDev, useMapStore } from "./map-store";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-2 border-t pt-3"><h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>{children}</section>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-xs text-muted-foreground">{label}</span>{children}</label>;
}

export function NodePanel({ node, canEdit, onClose }: { node: DevNode; canEdit: boolean; onClose: () => void }) {
  const store = useMapStore();
  const users = useUsers().data ?? [];
  const tasks = useTasks(node.projectId).data ?? [];
  const updateTask = useUpdateTask();
  const task = tasks.find((t) => t.id === node.taskId);
  const n = applyTask(node, task); // a linked node shows the shared task's live fields
  const [label, setLabel] = useState("");
  const [item, setItem] = useState("");
  const [comment, setComment] = useState("");
  const [linkKind, setLinkKind] = useState<EdgeKind>("depends_on");
  const [linkTarget, setLinkTarget] = useState("");
  const [linkError, setLinkError] = useState("");
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const ro = !canEdit;
  const devs = store.nodes.filter(isDev).filter((x) => !x.hidden);
  const title = (id: string) => devs.find((x) => x.id === id)?.data.dev.title ?? "Deleted node";
  const related = store.edges.filter((e) => !e.hidden && (e.source === n.id || e.target === n.id));
  const set = (patch: Partial<DevNode>, msg?: string) => store.updateNode(n.id, patch, msg);
  /** Status, priority, assignee and deadline are edited on the shared task when one is linked. */
  const setShared = (patch: Partial<DevNode>, msg?: string) => {
    if (!task) return set(patch, msg);
    const { status, priority, assigneeId, dueDate } = patch;
    updateTask.mutate({ id: task.id, patch: { ...(status ? statusPatch(task, status) : {}), ...(priority ? { priority } : {}), ...(assigneeId !== undefined ? { assigneeId } : {}), ...(dueDate ? { dueDate } : {}) } });
  };

  return (
    <aside aria-label="Node details" className="absolute inset-y-0 right-0 z-10 w-full max-w-sm space-y-3 overflow-y-auto border-l bg-background p-4 shadow-lg">
      <div className="flex items-center gap-2">
        <select aria-label="Node type" disabled={ro} className={`${inputCls} w-auto`} value={n.type} onChange={(e) => set({ type: e.target.value as NodeType }, `changed type to ${nodeTypeMeta[e.target.value as NodeType].label.toLowerCase()}`)}>
          {nodeTypes.map((t) => <option key={t} value={t}>{nodeTypeMeta[t].label}</option>)}
        </select>
        <span className="font-mono text-xs text-muted-foreground" title={n.id}>{n.id.slice(0, 8)}</span>
        <Button variant="ghost" size="icon" className="ml-auto" aria-label="Close panel" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <input aria-label="Title" disabled={ro || !!task} className="w-full rounded-md border bg-background px-2 py-1.5 text-base font-medium" value={n.title} onChange={(e) => set({ title: e.target.value })} />
      {task && (
        <p className="rounded-md bg-primary/5 p-2 text-xs text-muted-foreground">
          Linked to a task. Title, status, priority, assignee, deadline and progress are shared with it, so edits here also change the task.{" "}
          <Link className="text-primary hover:underline" to={`/projects/${n.projectId}/tasks?task=${task.id}`}>Open task</Link>
        </p>
      )}
      {updateTask.isError && <p role="alert" className="text-sm text-destructive">{updateTask.error.message}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <select disabled={ro} className={inputCls} value={n.status} onChange={(e) => setShared({ status: e.target.value as TaskStatus }, `changed status to ${taskStatusLabel[e.target.value as TaskStatus]}`)}>
            {Object.entries(taskStatusLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select disabled={ro} className={inputCls} value={n.priority} onChange={(e) => setShared({ priority: e.target.value as Priority }, `changed priority to ${priorityLabel[e.target.value as Priority]}`)}>
            {Object.entries(priorityLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field label="Assignee">
          <select disabled={ro} className={inputCls} value={n.assigneeId ?? ""} onChange={(e) => setShared({ assigneeId: e.target.value || null }, e.target.value ? `assigned to ${name(e.target.value)}` : "unassigned this node")}>
            <option value="">Unassigned</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>
        <Field label="Linked task">
          <select disabled={ro} className={inputCls} value={n.taskId ?? ""} onChange={(e) => set({ taskId: e.target.value || null }, e.target.value ? "linked a task" : "unlinked the task")}>
            <option value="">None</option>
            {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </Field>
        <Field label="Start date"><input type="date" disabled={ro} className={inputCls} value={n.startDate ?? ""} onChange={(e) => set({ startDate: e.target.value || null })} /></Field>
        <Field label="Due date"><input type="date" disabled={ro} className={inputCls} value={n.dueDate ?? ""} onChange={(e) => setShared({ dueDate: e.target.value || null }, e.target.value ? `set due date to ${fmtDate(e.target.value)}` : "cleared the due date")} /></Field>
      </div>
      <Field label={`Progress: ${n.progress}%${n.checklist.length ? " (from checklist)" : ""}`}>
        <input type="range" min={0} max={100} step={5} disabled={ro || !!task} value={n.progress} onChange={(e) => set({ progress: Number(e.target.value) })} className="w-full" />
      </Field>
      <Field label="Description"><textarea rows={3} disabled={ro} className={`${inputCls} h-auto py-1.5`} value={n.description} onChange={(e) => set({ description: e.target.value })} /></Field>

      <Section title="Labels">
        <div className="flex flex-wrap gap-1">
          {n.labels.map((l) => (
            <span key={l} className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs">{l}
              {!ro && <button aria-label={`Remove label ${l}`} onClick={() => set({ labels: n.labels.filter((x) => x !== l) })}><X className="h-3 w-3" /></button>}</span>
          ))}
        </div>
        {!ro && <input className={inputCls} placeholder="Add a label and press Enter" value={label} onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => { const v = label.trim(); if (e.key === "Enter" && v && !n.labels.includes(v)) { set({ labels: [...n.labels, v] }); setLabel(""); } }} />}
      </Section>

      <Section title="Checklist">
        <ul className="space-y-1">
          {n.checklist.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <input type="checkbox" aria-label={c.text} disabled={ro} checked={c.done} onChange={() => store.setChecklist(n.id, n.checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))} />
              <span className={c.done ? "mr-auto text-muted-foreground line-through" : "mr-auto"}>{c.text}</span>
              {!ro && <button aria-label={`Remove ${c.text}`} onClick={() => store.setChecklist(n.id, n.checklist.filter((x) => x.id !== c.id))}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
            </li>
          ))}
        </ul>
        {!ro && <input className={inputCls} placeholder="Add an item and press Enter" value={item} onChange={(e) => setItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && item.trim()) { store.setChecklist(n.id, [...n.checklist, { id: crypto.randomUUID(), text: item.trim(), done: false }]); setItem(""); } }} />}
      </Section>

      <Section title="Dependencies and relationships">
        {related.length === 0 && <p className="text-sm text-muted-foreground">No links yet. Drag from a node's right edge to another node, or add one here.</p>}
        <ul className="space-y-1">
          {related.map((e) => {
            const out = e.source === n.id;
            return (
              <li key={e.id} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{relationPhrase(e.data!.kind, out)}</span><span className="mr-auto truncate">{title(out ? e.target : e.source)}</span>
                {!ro && <button aria-label="Remove link" onClick={() => store.removeEdge(e.id)}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
              </li>
            );
          })}
        </ul>
        {!ro && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <select aria-label="Link type" className={`${inputCls} w-32`} value={linkKind} onChange={(e) => setLinkKind(e.target.value as EdgeKind)}>
                {edgeKinds.map((k) => <option key={k} value={k}>{edgeKindLabel[k]}</option>)}
              </select>
              <select aria-label="Link target" className={inputCls} value={linkTarget} onChange={(e) => setLinkTarget(e.target.value)}>
                <option value="">Choose a node</option>
                {devs.filter((x) => x.id !== n.id).map((x) => <option key={x.id} value={x.id}>{x.data.dev.title}</option>)}
              </select>
              <Button size="sm" variant="outline" disabled={!linkTarget} onClick={() => { const r = store.connect({ source: n.id, target: linkTarget, kind: linkKind }); setLinkError(r.ok ? "" : r.reason); if (r.ok) setLinkTarget(""); }}>Add</Button>
            </div>
            {linkError && <p role="alert" className="text-sm text-destructive">{linkError}</p>}
          </div>
        )}
      </Section>

      <Section title="Attachments">
        {n.attachments.length === 0 ? <p className="text-sm text-muted-foreground">No attachments.</p> : (
          <ul className="space-y-1 text-sm">{n.attachments.map((a) => <li key={a.id}>{a.name} <span className="text-xs text-muted-foreground">{Math.round(a.size / 1024)} KB</span></li>)}</ul>
        )}
        <Button size="sm" variant="outline" disabled title="Uploads need the attachment API (presigned URLs), which the backend team will provide">Attach file</Button>
      </Section>

      <Section title="Comments">
        <ul className="space-y-2">
          {n.comments.map((c) => <li key={c.id} className="flex gap-2"><Avatar name={name(c.authorId)} /><div><p className="text-xs text-muted-foreground">{name(c.authorId)} · {fmtDate(c.at.slice(0, 10))}</p><p className="text-sm">{c.text}</p></div></li>)}
        </ul>
        {!ro && (
          <div className="flex gap-2">
            <textarea aria-label="New comment" rows={2} className={`${inputCls} h-auto py-1.5`} value={comment} onChange={(e) => setComment(e.target.value)} />
            <Button size="sm" disabled={!comment.trim()} onClick={() => { store.addComment(n.id, comment.trim()); setComment(""); }}>Post</Button>
          </div>
        )}
      </Section>

      <Section title="Activity">
        {n.activity.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : (
          <ul className="space-y-1.5 text-sm">{n.activity.slice(0, 15).map((a) => <li key={a.id}><span className="font-medium">{name(a.actorId)}</span> {a.message}<span className="block text-xs text-muted-foreground">{fmtDate(a.at.slice(0, 10))}</span></li>)}</ul>
        )}
      </Section>
      <p className="pb-2 text-xs text-muted-foreground"><Badge tone={taskStatusTone[n.status]}>{taskStatusLabel[n.status]}</Badge> Changes save automatically.</p>
    </aside>
  );
}
