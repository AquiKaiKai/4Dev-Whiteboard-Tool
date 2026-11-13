import { create } from "zustand";

export type Tool =
  | "select" | "hand" | "pen" | "eraser" | "text" | "rect" | "circle" | "ellipse" | "line" | "arrow" | "connector" | "note";

interface WhiteboardState {
  tool: Tool;
  stroke: string;
  fill: string;
  strokeWidth: number;
  fontSize: number;
  zoom: number;
  selection: number;
  canUndo: boolean;
  canRedo: boolean;
  set: (patch: Partial<Omit<WhiteboardState, "set" | "reset">>) => void;
  reset: () => void;
}
const initial = { tool: "select" as Tool, stroke: "#2563eb", fill: "transparent", strokeWidth: 2, fontSize: 18, zoom: 1, selection: 0, canUndo: false, canRedo: false };

/** Toolbar/UI state for the open board. The canvas itself is owned by the engine. */
export const useWhiteboardStore = create<WhiteboardState>((set) => ({
  ...initial,
  set: (patch) => set(patch),
  reset: () => set(initial),
}));
