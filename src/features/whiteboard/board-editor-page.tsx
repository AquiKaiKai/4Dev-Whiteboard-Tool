import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QueryState } from "@/components/common/primitives";
import { usePermissions } from "@/hooks/use-permissions";
import type { Board, BoardSummary } from "@/types";
import { WhiteboardEngine } from "./canvas-engine";
import { boardKeys, saveBoardDocument, useBoard, useRenameBoard } from "./queries";
import { SaveIndicator } from "@/components/common/save-indicator";
import { useAutosave } from "@/hooks/use-autosave";
import { PropertiesPanel, ToolPalette, UndoRedo, ZoomControls, toolShortcuts } from "./toolbar";
import { useWhiteboardStore } from "./whiteboard-store";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function BoardEditorPage() {
  const { boardId } = useParams();
  const query = useBoard(boardId);
  return <QueryState query={query}>{(b) => <BoardEditor key={b.id} board={b} />}</QueryState>;
}

function BoardEditor({ board }: { board: Board }) {
  const canEdit = usePermissions()("board.edit");
  const host = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [engine, setEngine] = useState<WhiteboardEngine | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState(board.name);
  const version = useRef(board.version);
  const rename = useRenameBoard();
  const qc = useQueryClient();

  const autosave = useAutosave(async () => {
    if (!engine) return;
    const doc = engine.serialize(); // serialize before awaiting so later edits are not half-included
    const saved = await saveBoardDocument(board.id, doc, version.current);
    version.current = saved.version;
    // Keep the cached copy current so reopening the board shows the latest content and version.
    qc.setQueryData<Board>(boardKeys.detail(board.id), (old) => old && { ...old, document: doc, version: saved.version, updatedAt: saved.updatedAt });
    void qc.invalidateQueries({ queryKey: ["boards", "list"] });
  });
  const autosaveRef = useRef(autosave);
  autosaveRef.current = autosave;

  // Declared before the engine effect so unsaved changes flush before the canvas is disposed.
  useEffect(() => () => { if (autosaveRef.current.hasUnsaved()) void autosaveRef.current.retry(); }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (autosaveRef.current.hasUnsaved()) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  useEffect(() => {
    // Each engine gets its own wrapper so a late cleanup of one mount can never remove another mount's canvas.
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:absolute;inset:0";
    const el = document.createElement("canvas");
    wrap.appendChild(el);
    host.current!.appendChild(wrap);
    const ui = useWhiteboardStore;
    ui.getState().reset();
    const { stroke, fill, strokeWidth, fontSize } = ui.getState();
    const eng = new WhiteboardEngine(el, {
      onChange: () => autosaveRef.current.markChanged(),
      onSelection: (selection) => ui.getState().set({ selection }),
      onHistory: (canUndo, canRedo) => ui.getState().set({ canUndo, canRedo }),
      onZoom: (zoom) => ui.getState().set({ zoom }),
      onTool: (tool) => ui.getState().set({ tool }),
    }, { stroke, fill, strokeWidth, fontSize }, !canEdit);

    const unsub = ui.subscribe((s, prev) => {
      if (s.tool !== prev.tool && s.tool !== eng.currentTool) eng.setTool(s.tool);
      const patch = Object.fromEntries((["stroke", "fill", "strokeWidth", "fontSize"] as const).filter((k) => s[k] !== prev[k]).map((k) => [k, s[k]]));
      if (Object.keys(patch).length) eng.setStyle(patch);
    });
    const fit = () => host.current && eng.resize(host.current.clientWidth, host.current.clientHeight);
    const ro = new ResizeObserver(fit);
    ro.observe(host.current!);
    fit();
    void eng.load(board.document).then(() => setEngine(eng));

    const typing = (e: KeyboardEvent) => eng.editingText || /input|select|textarea/i.test((e.target as HTMLElement).tagName);
    const onKey = (e: KeyboardEvent) => {
      if (typing(e)) return;
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (e.code === "Space") { e.preventDefault(); eng.setSpace(true); return; }
      if (mod && k === "z") { e.preventDefault(); void (e.shiftKey ? eng.redo() : eng.undo()); }
      else if (mod && k === "y") { e.preventDefault(); void eng.redo(); }
      else if (!canEdit && !mod) return;
      else if (mod && k === "c") void eng.copy();
      else if (mod && k === "v") void eng.paste();
      else if (mod && k === "d") { e.preventDefault(); void eng.duplicate(); }
      else if (mod && k === "g") { e.preventDefault(); if (e.shiftKey) eng.ungroup(); else eng.group(); }
      else if (mod && k === "0") { e.preventDefault(); eng.resetView(); }
      else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); eng.deleteSelected(); }
      else if (e.key === "Escape") ui.getState().set({ tool: "select" });
      else if (k === "+" || k === "=") eng.zoomBy(1.2);
      else if (k === "-") eng.zoomBy(1 / 1.2);
      else if (!mod && toolShortcuts[k]) ui.getState().set({ tool: toolShortcuts[k]! });
    };
    const onUp = (e: KeyboardEvent) => e.code === "Space" && eng.setSpace(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
      unsub();
      ro.disconnect();
      setEngine(null);
      void eng.dispose().then(() => wrap.remove());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.id, canEdit]);

  const onImage = (file?: File) => {
    if (!file || !engine) return;
    if (file.size > MAX_IMAGE_BYTES) { setNotice("Images over 2 MB can't be inserted yet. Large uploads will use the attachment service once the backend exists."); return; }
    const reader = new FileReader();
    reader.onload = () => void engine.insertImage(String(reader.result));
    reader.readAsDataURL(file);
    setNotice(null);
  };
  const commitName = () => {
    const next = name.trim();
    if (!next || next === board.name || !canEdit) { setName(board.name); return; }
    rename.mutate({ id: board.id, name: next, version: version.current }, {
      onSuccess: (r) => {
        const s = r as BoardSummary;
        version.current = s.version;
        qc.setQueryData<Board>(boardKeys.detail(board.id), (old) => old && { ...old, name: s.name, version: s.version, updatedAt: s.updatedAt });
      },
    });
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b px-3 py-1.5">
        <Link to={`/projects/${board.projectId}/boards`} aria-label="Back to boards" className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent"><ArrowLeft className="h-4 w-4" /></Link>
        <input aria-label="Board name" value={name} readOnly={!canEdit} onChange={(e) => setName(e.target.value)} onBlur={commitName} onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          className="h-8 min-w-0 max-w-xs flex-1 rounded-md bg-transparent px-2 font-medium hover:bg-accent focus:bg-background" />
        {!canEdit && <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">View only</span>}
        {rename.isError && <span role="alert" className="text-xs text-destructive">{rename.error.message}</span>}
        <div className="ml-auto flex items-center gap-1">
          {canEdit && <UndoRedo engine={engine} />}
          {canEdit && <SaveIndicator state={autosave.state} onRetry={() => void autosave.retry()} />}
        </div>
      </header>
      <div className="relative min-h-0 flex-1 overflow-hidden" style={{ backgroundImage: "radial-gradient(hsl(var(--border)) 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
        <div ref={host} className="absolute inset-0" />
        {notice && <p role="alert" className="absolute left-1/2 top-3 z-10 max-w-md -translate-x-1/2 rounded-md border bg-background px-3 py-2 text-sm shadow-md">{notice}</p>}
        {canEdit && <PropertiesPanel engine={engine} />}
        <ToolPalette editable={canEdit} onImage={() => fileInput.current?.click()} />
        <ZoomControls engine={engine} />
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => { onImage(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
    </div>
  );
}
