import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { Avatar, Badge, ProgressBar } from "@/components/common/primitives";
import { useTasks } from "@/features/tasks/queries";
import { useUsers } from "@/features/team/queries";
import { cn } from "@/utils/cn";
import { fmtDate, todayISO } from "@/utils/dates";
import { priorityLabel, taskStatusLabel, taskStatusTone } from "@/utils/labels";
import { nodeTypeMeta } from "./constants";
import { applyTask, matchesFilters } from "./graph";
import { useMapStore, type DevFlowNode, type GroupFlowNode } from "./map-store";

export const DevNodeView = memo(function DevNodeView({ data, selected }: NodeProps<DevFlowNode>) {
  const task = useTasks(data.dev.projectId).data?.find((t) => t.id === data.dev.taskId);
  const n = applyTask(data.dev, task);
  const dim = !useMapStore((s) => matchesFilters(n, s.filters));
  const users = useUsers().data;
  const owner = users?.find((u) => u.id === n.assigneeId);
  const meta = nodeTypeMeta[n.type];
  const overdue = !!n.dueDate && n.dueDate < todayISO() && !["completed", "cancelled"].includes(n.status);
  return (
    <div className={cn("w-60 rounded-lg border border-l-4 bg-background p-3 shadow-sm transition-opacity", meta.accent, selected && "ring-2 ring-primary", dim && "opacity-25")}>
      <Handle type="target" position={Position.Left} />
      <div className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
        <meta.icon className="h-3.5 w-3.5" aria-hidden /><span>{meta.label}</span>
        {n.priority === "urgent" || n.priority === "high" ? <span className="ml-auto text-status-warning" title={`${priorityLabel[n.priority]} priority`}>{priorityLabel[n.priority]}</span> : null}
      </div>
      <p className="line-clamp-2 text-sm font-medium">{n.title}</p>
      <div className="mt-2 flex items-center gap-1.5">
        <Badge tone={taskStatusTone[n.status]}>{taskStatusLabel[n.status]}</Badge>
        {n.dueDate && <span className={cn("text-xs", overdue ? "text-status-danger" : "text-muted-foreground")}>{fmtDate(n.dueDate)}</span>}
        {owner && <span className="ml-auto"><Avatar name={owner.name} /></span>}
      </div>
      {n.type !== "note" && n.type !== "decision" && <div className="mt-2"><ProgressBar value={n.progress} /></div>}
      {n.labels.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{n.labels.slice(0, 3).map((l) => <span key={l} className="rounded bg-muted px-1.5 text-[10px] text-muted-foreground">{l}</span>)}</div>}
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

export const GroupView = memo(function GroupView({ data, selected }: NodeProps<GroupFlowNode>) {
  return (
    <div className={cn("h-full w-full rounded-lg border-2 border-dashed border-primary/40 bg-primary/5", selected && "border-primary")}>
      <span className="absolute left-3 top-2 text-xs font-medium text-muted-foreground">{data.group.name}</span>
    </div>
  );
});

export const flowNodeTypes = { dev: DevNodeView, group: GroupView };
