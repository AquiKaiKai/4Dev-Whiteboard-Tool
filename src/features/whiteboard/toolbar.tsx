import {
  ArrowDown, ArrowDownToLine, ArrowUp, ArrowUpRight, ArrowUpToLine, Circle, Copy, Eraser, Group, Hand, Image as ImageIcon,
  Link2, Maximize, Minus, MousePointer2, Pencil, Redo2, Square, StickyNote, Trash2, Type, Undo2, Ungroup, ZoomIn, ZoomOut,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";
import type { WhiteboardEngine } from "./canvas-engine";
import { useWhiteboardStore, type Tool } from "./whiteboard-store";

export function IconBtn({ label, onClick, active, disabled, children }: {
  label: string; onClick?: () => void; active?: boolean; disabled?: boolean; children: ReactNode;
}) {
  return (
    <button type="button" title={label} aria-label={label} aria-pressed={active} disabled={disabled} onClick={onClick}
      className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-md hover:bg-accent disabled:pointer-events-none disabled:opacity-40", active && "bg-primary/10 text-primary")}>
      {children}
    </button>
  );
}
const Ellipse = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden><ellipse cx="12" cy="12" rx="9" ry="6" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
);
const tools: [Tool, string, string, LucideIcon | (() => JSX.Element)][] = [
  ["select", "Select", "V", MousePointer2], ["hand", "Pan", "H", Hand], ["pen", "Pen", "P", Pencil], ["eraser", "Eraser", "E", Eraser],
  ["text", "Text", "T", Type], ["note", "Sticky note", "N", StickyNote], ["rect", "Rectangle", "R", Square], ["circle", "Circle", "C", Circle],
  ["ellipse", "Ellipse", "O", Ellipse], ["line", "Line", "L", Minus], ["arrow", "Arrow", "A", ArrowUpRight], ["connector", "Connector (drag between two objects)", "K", Link2],
];
export const toolShortcuts: Record<string, Tool> = Object.fromEntries(tools.map(([t, , k]) => [k.toLowerCase(), t]));

export function ToolPalette({ onImage, editable }: { onImage: () => void; editable: boolean }) {
  const tool = useWhiteboardStore((s) => s.tool);
  const set = useWhiteboardStore((s) => s.set);
  const list = editable ? tools : tools.slice(0, 2);
  return (
    <div role="toolbar" aria-label="Drawing tools" className="absolute bottom-4 left-1/2 z-10 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 gap-0.5 overflow-x-auto rounded-lg border bg-background p-1 shadow-md">
      {list.map(([t, label, key, Icon]) => (
        <IconBtn key={t} label={`${label} (${key})`} active={tool === t} onClick={() => set({ tool: t })}><Icon className="h-4 w-4" /></IconBtn>
      ))}
      {editable && <IconBtn label="Insert image" onClick={onImage}><ImageIcon className="h-4 w-4" /></IconBtn>}
    </div>
  );
}

const swatches = ["#2563eb", "#16a34a", "#dc2626", "#f59e0b", "#111827", "#ffffff"];
const drawingTools: Tool[] = ["pen", "rect", "circle", "ellipse", "line", "arrow", "connector", "text"];

export function PropertiesPanel({ engine }: { engine: WhiteboardEngine | null }) {
  const s = useWhiteboardStore();
  if (!(s.selection > 0 || drawingTools.includes(s.tool))) return null;
  const textual = s.tool === "text" || s.selection > 0;
  const filled = ["rect", "circle", "ellipse"].includes(s.tool) || s.selection > 0;
  return (
    <div className="absolute left-3 top-3 z-10 w-56 space-y-3 rounded-lg border bg-background p-3 shadow-md" aria-label="Properties">
      <div>
        <p className="mb-1 text-xs text-muted-foreground">Stroke / text</p>
        <div className="flex items-center gap-1">
          {swatches.map((c) => (
            <button key={c} type="button" aria-label={`Stroke ${c}`} onClick={() => s.set({ stroke: c })} style={{ background: c }}
              className={cn("h-5 w-5 rounded-full border", s.stroke === c && "ring-2 ring-primary ring-offset-1 ring-offset-background")} />
          ))}
          <input type="color" aria-label="Custom stroke color" value={s.stroke} onChange={(e) => s.set({ stroke: e.target.value })} className="h-5 w-6 cursor-pointer bg-transparent" />
        </div>
      </div>
      {filled && (
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Fill</p>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={s.fill === "transparent"} onChange={(e) => s.set({ fill: e.target.checked ? "transparent" : "#dbeafe" })} /> None</label>
            <input type="color" aria-label="Fill color" disabled={s.fill === "transparent"} value={s.fill === "transparent" ? "#dbeafe" : s.fill} onChange={(e) => s.set({ fill: e.target.value })} className="h-5 w-6 cursor-pointer bg-transparent disabled:opacity-40" />
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <label className="flex-1 text-xs text-muted-foreground">Stroke width
          <select className="mt-1 h-7 w-full rounded-md border bg-background px-1 text-sm text-foreground" value={s.strokeWidth} onChange={(e) => s.set({ strokeWidth: Number(e.target.value) })}>
            {[1, 2, 4, 8].map((w) => <option key={w} value={w}>{w}px</option>)}
          </select>
        </label>
        {textual && (
          <label className="flex-1 text-xs text-muted-foreground">Text size
            <select className="mt-1 h-7 w-full rounded-md border bg-background px-1 text-sm text-foreground" value={s.fontSize} onChange={(e) => s.set({ fontSize: Number(e.target.value) })}>
              {[12, 16, 18, 24, 36, 48].map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </label>
        )}
      </div>
      {s.selection > 0 && engine && (
        <div className="flex flex-wrap gap-0.5 border-t pt-2">
          <IconBtn label="Bring to front" onClick={() => engine.arrange("front")}><ArrowUpToLine className="h-4 w-4" /></IconBtn>
          <IconBtn label="Bring forward" onClick={() => engine.arrange("forward")}><ArrowUp className="h-4 w-4" /></IconBtn>
          <IconBtn label="Send backward" onClick={() => engine.arrange("backward")}><ArrowDown className="h-4 w-4" /></IconBtn>
          <IconBtn label="Send to back" onClick={() => engine.arrange("back")}><ArrowDownToLine className="h-4 w-4" /></IconBtn>
          <IconBtn label="Group (Ctrl+G)" disabled={s.selection < 2} onClick={() => engine.group()}><Group className="h-4 w-4" /></IconBtn>
          <IconBtn label="Ungroup (Ctrl+Shift+G)" onClick={() => engine.ungroup()}><Ungroup className="h-4 w-4" /></IconBtn>
          <IconBtn label="Duplicate (Ctrl+D)" onClick={() => void engine.duplicate()}><Copy className="h-4 w-4" /></IconBtn>
          <IconBtn label="Delete (Del)" onClick={() => engine.deleteSelected()}><Trash2 className="h-4 w-4" /></IconBtn>
        </div>
      )}
    </div>
  );
}

export function ZoomControls({ engine }: { engine: WhiteboardEngine | null }) {
  const zoom = useWhiteboardStore((s) => s.zoom);
  return (
    <div className="absolute bottom-4 right-3 z-10 flex items-center rounded-lg border bg-background p-1 shadow-md">
      <IconBtn label="Zoom out (-)" onClick={() => engine?.zoomBy(1 / 1.2)}><ZoomOut className="h-4 w-4" /></IconBtn>
      <span className="w-11 text-center text-xs tabular-nums" aria-live="polite">{Math.round(zoom * 100)}%</span>
      <IconBtn label="Zoom in (+)" onClick={() => engine?.zoomBy(1.2)}><ZoomIn className="h-4 w-4" /></IconBtn>
      <IconBtn label="Reset view (Ctrl+0)" onClick={() => engine?.resetView()}><Maximize className="h-4 w-4" /></IconBtn>
    </div>
  );
}

export function UndoRedo({ engine }: { engine: WhiteboardEngine | null }) {
  const { canUndo, canRedo } = useWhiteboardStore();
  return (
    <>
      <IconBtn label="Undo (Ctrl+Z)" disabled={!canUndo} onClick={() => void engine?.undo()}><Undo2 className="h-4 w-4" /></IconBtn>
      <IconBtn label="Redo (Ctrl+Shift+Z)" disabled={!canRedo} onClick={() => void engine?.redo()}><Redo2 className="h-4 w-4" /></IconBtn>
    </>
  );
}
