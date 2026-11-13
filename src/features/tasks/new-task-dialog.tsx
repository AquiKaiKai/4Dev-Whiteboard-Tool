import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/common/modal";
import { inputCls } from "@/components/common/primitives";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/features/projects/queries";
import { useUsers } from "@/features/team/queries";
import { taskSchema, type TaskFormValues } from "@/schemas/task";
import { useSessionStore } from "@/stores/session-store";
import { priorityLabel, taskStatusLabel } from "@/utils/labels";
import { useCreateTask } from "./queries";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block space-y-1"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}{error && <span role="alert" className="block text-xs text-destructive">{error}</span>}</label>;
}

export function NewTaskDialog({ projectId, defaultAssigneeId, onClose, onCreated }: { projectId?: string; defaultAssigneeId?: string; onClose: () => void; onCreated?: (id: string) => void }) {
  const projects = useProjects().data?.filter((p) => p.status !== "archived") ?? [];
  const users = useUsers().data ?? [];
  const me = useSessionStore((s) => s.userId);
  const create = useCreateTask();
  const { register, handleSubmit, formState: { errors } } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", projectId: projectId ?? "", assigneeId: defaultAssigneeId ?? me, status: "todo", priority: "medium", dueDate: "" },
  });
  return (
    <Modal title="New task" onClose={onClose}>
      <form className="space-y-3" noValidate onSubmit={handleSubmit((v) => create.mutate({ ...v, assigneeId: v.assigneeId || null }, { onSuccess: (t) => { onCreated?.(t.id); onClose(); } }))}>
        <Field label="Title" error={errors.title?.message}><input autoFocus className={inputCls} {...register("title")} /></Field>
        {!projectId && <Field label="Project" error={errors.projectId?.message}><select className={inputCls} {...register("projectId")}><option value="">Choose a project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}</select></Field>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Assignee"><select className={inputCls} {...register("assigneeId")}><option value="">Unassigned</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
          <Field label="Deadline" error={errors.dueDate?.message}><input type="date" className={inputCls} {...register("dueDate")} /></Field>
          <Field label="Priority"><select className={inputCls} {...register("priority")}>{Object.entries(priorityLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="Status"><select className={inputCls} {...register("status")}>{Object.entries(taskStatusLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
        </div>
        {create.isError && <p role="alert" className="text-sm text-destructive">{create.error.message}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={create.isPending}>{create.isPending ? "Creating..." : "Create task"}</Button></div>
      </form>
    </Modal>
  );
}
