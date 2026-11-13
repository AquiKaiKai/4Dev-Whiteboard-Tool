import { useCallback, useEffect, useReducer, useRef } from "react";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "failed";
export interface SaveState {
  status: SaveStatus;
  error?: string;
  /** True when edits arrived while a save was in flight, so that save does not cover them. */
  stale?: boolean;
}
type Action = { type: "change" } | { type: "start" } | { type: "success" } | { type: "fail"; error: string };

export function saveReducer(state: SaveState, action: Action): SaveState {
  switch (action.type) {
    case "change":
      return state.status === "saving" ? { status: "saving", stale: true } : { status: "dirty" };
    case "start":
      return { status: "saving" };
    case "success":
      return state.stale ? { status: "dirty" } : { status: "saved" };
    case "fail":
      return { status: "failed", error: action.error };
  }
}

/** Debounced autosave with visible failure and manual retry. `save` must serialize synchronously first. */
export function useAutosave(save: () => Promise<void>, delay = 1500) {
  const [state, dispatch] = useReducer(saveReducer, { status: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const saving = useRef(false);
  const queued = useRef(false);
  const saveRef = useRef(save);
  saveRef.current = save;
  const stateRef = useRef(state);
  stateRef.current = state;

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (saving.current) { queued.current = true; return; }
    saving.current = true;
    dispatch({ type: "start" });
    try {
      await saveRef.current();
      dispatch({ type: "success" });
    } catch (e) {
      dispatch({ type: "fail", error: e instanceof Error ? e.message : "Unknown error" });
    } finally {
      saving.current = false;
      if (queued.current) { queued.current = false; timer.current = setTimeout(() => void flush(), delay); }
    }
  }, [delay]);

  const markChanged = useCallback(() => {
    dispatch({ type: "change" });
    if (saving.current) { queued.current = true; return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), delay);
  }, [delay, flush]);

  useEffect(() => () => clearTimeout(timer.current), []);
  const hasUnsaved = () => ["dirty", "failed"].includes(stateRef.current.status) || !!stateRef.current.stale;
  return { state, markChanged, retry: flush, hasUnsaved };
}
