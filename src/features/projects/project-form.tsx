import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { inputCls } from "@/components/common/primitives";
import { Button } from "@/components/ui/button";
import { projectSchema, type ProjectInput } from "@/schemas/project";
import type { Project } from "@/types";
import { priorityLabel } from "@/utils/labels";
import { useUsers } from "@/features/team/queries";
import { useCreateProject, useUpdateProject } from "./queries";

const statuses = { planning: "Planning", active: "Active", on_hold: "On hold", completed: "Completed" } as const;

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error && <span role="alert" className="block text-xs text-destructive">{error}</span>}
    </label>
  );
}

export function ProjectForm({ project, onDone }: { project?: Project; onDone: () => void }) {
  const users = useUsers();
  const create = useCreateProject();
  const update = useUpdateProject();
  const mutation = project ? update : create;
  const { register, handleSubmit, formState: { errors } } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema),
    defaultValues: project
      ? { name: project.name, description: project.description, ownerId: project.ownerId, memberIds: project.memberIds,
          status: project.status === "archived" ? "completed" : project.status, priority: project.priority,
          startDate: project.startDate, targetDate: project.targetDate }
      : { name: "", description: "", ownerId: "u1", memberIds: ["u1"], status: "planning", priority: "medium", startDate: "", targetDate: "" },
  });

  const onSubmit = (v: ProjectInput) => {
    const input = { ...v, memberIds: Array.from(new Set([...v.memberIds, v.ownerId])) };
    const done = { onSuccess: onDone };
    if (project) update.mutate({ id: project.id, patch: input, version: project.version }, done);
    else create.mutate(input, done);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
      <Field label="Name" error={errors.name?.message}><input className={inputCls} {...register("name")} /></Field>
      <Field label="Description" error={errors.description?.message}>
        <textarea rows={3} className={`${inputCls} h-auto py-1.5`} {...register("description")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Owner" error={errors.ownerId?.message}>
          <select className={inputCls} {...register("ownerId")}>
            {users.data?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputCls} {...register("status")}>
            {Object.entries(statuses).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field label="Priority">
          <select className={inputCls} {...register("priority")}>
            {Object.entries(priorityLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <span />
        <Field label="Start date" error={errors.startDate?.message}><input type="date" className={inputCls} {...register("startDate")} /></Field>
        <Field label="Target completion" error={errors.targetDate?.message}><input type="date" className={inputCls} {...register("targetDate")} /></Field>
      </div>
      <fieldset>
        <legend className="mb-1 text-xs font-medium text-muted-foreground">Members</legend>
        <div className="grid grid-cols-2 gap-1">
          {users.data?.map((u) => (
            <label key={u.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" value={u.id} {...register("memberIds")} /> {u.name}
            </label>
          ))}
        </div>
      </fieldset>
      {mutation.isError && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onDone}>Cancel</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : project ? "Save changes" : "Create project"}</Button>
      </div>
    </form>
  );
}
