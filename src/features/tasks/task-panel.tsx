import { X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, inputCls } from "@/components/common/primitives";
import { Button } from "@/components/ui/button";
import { useDevMap } from "@/features/development-map/queries";
import { useSessionStore } from "@/stores/session-store";
import type { ChecklistItem, Subtask, Task, TaskStatus, User } from "@/types";
import type { Priority } from "@/types";
import { fmtDate } from "@/utils/dates";
import { priorityLabel, taskStatusLabel } from "@/utils/labels";
import { nodeTypeMeta } from "@/features/development-map/constants";
import { statusPatch, taskProgress } from "./task-utils";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-2 border-t pt-3"><h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>{children}</section>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-xs text-muted-foreground">{label}</span>{children}</label>;
}

interface ItemListProps<T extends { id: string; done: boolean }> { items: T[]; text: (i: T) => string; ro: boolean; onChange: (items: T[]) => void; make: (text: string) => T; placeholder: string }
function ItemList<T extends { id: string; done: boolean }>({ items, text, ro, onChange, make, placeholder }: ItemListProps<T>) {
  const [draft, setDraft] = useState("");
  return (
    <>
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-2">
            <input type="checkbox" aria-label={text(i)} disabled={ro} checked={i.done} onChange={() => onChange(items.map((x) => (x.id === i.id ? { ...x, done: !x.done } : x)))} />
            <span className={i.done ? "mr-auto text-muted-foreground line-through" : "mr-auto"}>{text(i)}</span>
            {!ro && <button aria-label={`Remove ${text(i)}`} onClick={() => onChange(items.filter((x) => x.id !== i.id))}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
          </li>
        ))}
      </ul>
      {!ro && <input className={inputCls} placeholder={placeholder} value={draft} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { onChange([...items, make(draft.trim())]); setDraft(""); } }} />}
    </>
  );
}

interface Props { task: Task; users: User[]; canEdit: boolean; onUpdate: (patch: Partial<Task>) => void; onClose: () => void }

export function TaskPanel({ task: t, users, canEdit, onUpdate, onClose }: Props) {
  const me = useSessionStore((s) => s.userId);
  const map = useDevMap(t.projectId);
  const [label, setLabel] = useState("");
  const [comment, setComment] = useState("");
  const ro = !canEdit;
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? id;
  const linked = map.data?.nodes.filter((n) => n.taskId === t.id && !n.deletedAt) ?? [];
  const derived = t.subtasks.length + t.checklist.length > 0;
  const setItems = (patch: { subtasks?: Subtask[]; checklist?: ChecklistItem[] }) =>
    onUpdate({ ...patch, progress: taskProgress(patch.subtasks ?? t.subtasks, patch.checklist ?? t.checklist, t.progress) });
  const commitText = (key: "title" | "description", value: string) => {
    const v = value.trim();
    if (v !== t[key] && (key === "description" || v)) onUpdate({ [key]: v });
  };

  return (
    <aside aria-label="Task details" className="fixed inset-y-0 right-0 z-30 w-full max-w-md space-y-3 overflow-y-auto border-l bg-background p-4 shadow-lg">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">Task</h2>
        <Button variant="ghost" size="icon" className="ml-auto" aria-label="Close panel" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <input key={`${t.id}-title`} aria-label="Title" disabled={ro} className="w-full rounded-md border bg-background px-2 py-1.5 text-base font-medium" defaultValue={t.title}
        onBlur={(e) => commitText("title", e.target.value)} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Status"><select disabled={ro} className={inputCls} value={t.status} onChange={(e) => onUpdate(statusPatch(t, e.target.value as TaskStatus))}>
          {Object.entries(taskStatusLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Priority"><select disabled={ro} className={inputCls} value={t.priority} onChange={(e) => onUpdate({ priority: e.target.value as Priority })}>
          {Object.entries(priorityLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        <Field label="Assignee"><select disabled={ro} className={inputCls} value={t.assigneeId ?? ""} onChange={(e) => onUpdate({ assigneeId: e.target.value || null })}>
          <option value="">Unassigned</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
        <Field label="Deadline"><input type="date" disabled={ro} className={inputCls} value={t.dueDate} onChange={(e) => e.target.value && onUpdate({ dueDate: e.target.value })} /></Field>
      </div>
      <Field label={`Progress: ${t.progress}%${derived ? " (from subtasks and checklist)" : ""}`}>
        <input key={`${t.id}-${derived}`} type="range" min={0} max={100} step={5} disabled={ro || derived} defaultValue={t.progress} className="w-full"
          onMouseUp={(e) => onUpdate({ progress: Number(e.currentTarget.value) })} onKeyUp={(e) => onUpdate({ progress: Number(e.currentTarget.value) })} onTouchEnd={(e) => onUpdate({ progress: Number(e.currentTarget.value) })} />
      </Field>
      <Field label="Description"><textarea key={`${t.id}-desc`} rows={3} disabled={ro} className={`${inputCls} h-auto py-1.5`} defaultValue={t.description} onBlur={(e) => commitText("description", e.target.value)} /></Field>

      <Section title="Subtasks"><ItemList ro={ro} items={t.subtasks} text={(s) => s.title} placeholder="Add a subtask and press Enter" make={(title) => ({ id: crypto.randomUUID(), title, done: false })} onChange={(subtasks) => setItems({ subtasks })} /></Section>
      <Section title="Checklist"><ItemList ro={ro} items={t.checklist} text={(c) => c.text} placeholder="Add an item and press Enter" make={(text) => ({ id: crypto.randomUUID(), text, done: false })} onChange={(checklist) => setItems({ checklist })} /></Section>

      <Section title="Labels">
        <div className="flex flex-wrap gap-1">{t.labels.map((l) => (
          <span key={l} className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs">{l}{!ro && <button aria-label={`Remove label ${l}`} onClick={() => onUpdate({ labels: t.labels.filter((x) => x !== l) })}><X className="h-3 w-3" /></button>}</span>))}</div>
        {!ro && <input className={inputCls} placeholder="Add a label and press Enter" value={label} onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => { const v = label.trim(); if (e.key === "Enter" && v && !t.labels.includes(v)) { onUpdate({ labels: [...t.labels, v] }); setLabel(""); } }} />}
      </Section>

      <Section title="Linked development nodes">
        {linked.length === 0 ? <p className="text-sm text-muted-foreground">Not linked yet. Link this task from a node's panel in the development map.</p> : (
          <ul className="space-y-1 text-sm">{linked.map((n) => <li key={n.id}><span className="text-muted-foreground">{nodeTypeMeta[n.type].label}:</span> {n.title}</li>)}</ul>
        )}
        <Link to={`/projects/${t.projectId}/map`} className="text-sm text-primary hover:underline">Open development map</Link>
      </Section>

      <Section title="Comments">
        <ul className="space-y-2">{t.comments.map((c) => <li key={c.id} className="flex gap-2"><Avatar name={name(c.authorId)} /><div><p className="text-xs text-muted-foreground">{name(c.authorId)} · {fmtDate(c.at.slice(0, 10))}</p><p className="text-sm">{c.text}</p></div></li>)}</ul>
        {!ro && (
          <div className="flex gap-2">
            <textarea aria-label="New comment" rows={2} className={`${inputCls} h-auto py-1.5`} value={comment} onChange={(e) => setComment(e.target.value)} />
            <Button size="sm" disabled={!comment.trim()} onClick={() => { onUpdate({ comments: [...t.comments, { id: crypto.randomUUID(), authorId: me, text: comment.trim(), at: new Date().toISOString() }] }); setComment(""); }}>Post</Button>
          </div>
        )}
      </Section>
    </aside>
  );
}
