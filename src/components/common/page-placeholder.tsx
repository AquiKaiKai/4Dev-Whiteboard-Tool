import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  phase: number;
}

/** Temporary empty state for modules that land in a later phase. */
export function PagePlaceholder({ icon: Icon, title, description, phase }: Props) {
  return (
    <div className="grid h-full place-items-center p-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-lg border bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
        </div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 text-muted-foreground">{description}</p>
        <p className="mt-3 text-xs text-muted-foreground">Scheduled for Phase {phase}.</p>
      </div>
    </div>
  );
}
