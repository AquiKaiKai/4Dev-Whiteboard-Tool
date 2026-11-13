import type { UseQueryResult } from "@tanstack/react-query";
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";
import type { Tone } from "@/utils/labels";

export const inputCls =
  "h-8 w-full rounded-md border bg-background px-2 text-sm placeholder:text-muted-foreground";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border bg-background", className)} {...props} />;
}

const tones: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground",
  blue: "bg-primary/10 text-primary",
  green: "bg-status-success/10 text-status-success",
  amber: "bg-status-warning/10 text-status-warning",
  red: "bg-status-danger/10 text-status-danger",
};
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span title={name} aria-label={name} className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary ring-2 ring-background", className)}>
      {initials}
    </span>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} className="h-1.5 w-full rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function QueryState<T>({ query, children, isEmpty, emptyText = "Nothing here yet." }: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  isEmpty?: (data: T) => boolean;
  emptyText?: string;
}) {
  if (query.isPending) return <p role="status" className="p-6 text-muted-foreground">Loading...</p>;
  if (query.isError)
    return (
      <div role="alert" className="p-6">
        <p className="text-destructive">{query.error.message}</p>
        <button className="mt-2 text-primary hover:underline" onClick={() => query.refetch()}>Try again</button>
      </div>
    );
  if (isEmpty?.(query.data)) return <p className="p-6 text-muted-foreground">{emptyText}</p>;
  return <>{children(query.data)}</>;
}

export const MockNotice = () => (
  <p className="text-xs text-muted-foreground">Demo data held in memory. Changes are not saved and reset on reload.</p>
);
