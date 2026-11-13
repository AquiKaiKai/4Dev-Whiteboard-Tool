import { cn } from "@/utils/cn";
import type { SaveState } from "@/hooks/use-autosave";

const demo = import.meta.env.VITE_API_MODE !== "rest";
export function SaveIndicator({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  const s = state.status;
  const text = s === "saving" ? "Saving..." : s === "failed" ? "Save failed" : s === "dirty" ? "Unsaved changes" : "All changes saved";
  return (
    <div role="status" aria-live="polite" className={cn("flex items-center gap-2 text-xs", s === "failed" ? "text-destructive" : "text-muted-foreground")}>
      <span>{text}</span>
      {s === "failed" && (
        <>
          <button className="font-medium underline" onClick={onRetry}>Retry saving</button>
          {state.error && <span className="hidden max-w-60 truncate md:inline" title={state.error}>{state.error}</span>}
        </>
      )}
      {demo && s !== "failed" && <span title="Mock service: saved to memory only, reset on reload" className="rounded bg-muted px-1.5 py-0.5">Demo storage</span>}
    </div>
  );
}
