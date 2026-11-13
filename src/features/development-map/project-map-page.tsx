import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QueryState } from "@/components/common/primitives";
import { SaveIndicator } from "@/components/common/save-indicator";
import { useProject } from "@/features/projects/queries";
import { useAutosave } from "@/hooks/use-autosave";
import { usePermissions } from "@/hooks/use-permissions";
import { useUiStore } from "@/stores/ui-store";
import type { DevMap } from "@/types";
import { flowNodeTypes } from "./flow-nodes";
import { filtersActive, matchesFilters, validateConnection } from "./graph";
import { MapToolbar } from "./map-toolbar";
import { isDev, isGroup, useMapStore } from "./map-store";
import { NodePanel } from "./node-panel";
import { mapKeys, saveDevMap, useDevMap } from "./queries";

export function ProjectMapPage() {
  const { projectId } = useParams();
  const query = useDevMap(projectId);
  return <QueryState query={query}>{(m) => <MapEditor key={m.projectId} map={m} />}</QueryState>;
}

function MapEditor({ map }: { map: DevMap }) {
  const canEdit = usePermissions()("map.edit");
  const project = useProject(map.projectId).data;
  const theme = useUiStore((s) => s.theme);
  const store = useMapStore();
  const qc = useQueryClient();
  const canvas = useRef<HTMLDivElement>(null);
  const version = useRef(map.version);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");

  const autosave = useAutosave(async () => {
    const doc = useMapStore.getState().serialize(); // serialize first so later edits are not half-included
    const saved = await saveDevMap(map.projectId, doc, version.current);
    version.current = saved.version;
    // Keep the cached copy current so reopening the map shows the latest content and version.
    qc.setQueryData<DevMap>(mapKeys.detail(map.projectId), (old) => old && { ...old, ...doc, version: saved.version, updatedAt: saved.updatedAt });
    void qc.invalidateQueries({ queryKey: mapKeys.list });
  });
  const autosaveRef = useRef(autosave);
  autosaveRef.current = autosave;

  useEffect(() => {
    useMapStore.getState().load(map);
    setReady(true);
    const unsub = useMapStore.subscribe((s, p) => { if (s.rev !== p.rev) autosaveRef.current.markChanged(); });
    const warn = (e: BeforeUnloadEvent) => { if (autosaveRef.current.hasUnsaved()) e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => {
      unsub();
      window.removeEventListener("beforeunload", warn);
      if (autosaveRef.current.hasUnsaved()) void autosaveRef.current.retry();
    };
  // Load once per project. Cache updates after a save must not reset the canvas mid-edit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map.projectId]);

  const devs = store.nodes.filter(isDev).filter((n) => !n.hidden);
  const shown = devs.filter((n) => matchesFilters(n.data.dev, store.filters)).length;
  const picked = store.nodes.filter((n) => n.selected && !n.hidden);
  const single = picked.length === 1 ? picked[0] : undefined;
  const clearNotice = () => setNotice("");

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b px-3 py-1.5">
        <Link to={`/projects/${map.projectId}`} aria-label="Back to project" className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent"><ArrowLeft className="h-4 w-4" /></Link>
        <div className="mr-auto min-w-0"><p className="truncate font-medium">Development map{project ? ` · ${project.name}` : ""}</p>
          <p className="text-xs text-muted-foreground">{devs.length} nodes · <span title="Mock service: kept in memory only">Demo data</span></p></div>
        {!canEdit && <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">View only</span>}
        {canEdit && <SaveIndicator state={autosave.state} onRetry={() => void autosave.retry()} />}
      </header>
      <ReactFlowProvider>
        <MapToolbar canEdit={canEdit} canvas={canvas} shown={shown} total={devs.length} />
        <div ref={canvas} className="relative min-h-0 flex-1">
          {notice && <p role="alert" className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-md border bg-background px-3 py-2 text-sm shadow-md">{notice} <button className="ml-2 text-primary" onClick={clearNotice}>Dismiss</button></p>}
          {ready && devs.length === 0 && <p className="pointer-events-none absolute inset-0 z-10 grid place-items-center text-muted-foreground">{canEdit ? "This map is empty. Use Add node to start planning." : "This map is empty."}</p>}
          {ready && (
            <ReactFlow
              nodes={store.nodes} edges={store.edges} nodeTypes={flowNodeTypes}
              onNodesChange={store.onNodesChange} onEdgesChange={store.onEdgesChange}
              onConnect={(c) => { const r = store.connect({ source: c.source, target: c.target }); setNotice(r.ok ? "" : r.reason); }}
              isValidConnection={(c) => validateConnection(useMapStore.getState().edges.map((e) => ({ id: e.id, source: e.source, target: e.target, kind: e.data!.kind })), { source: c.source, target: c.target, kind: useMapStore.getState().linkKind }).ok}
              nodesDraggable={canEdit} nodesConnectable={canEdit} edgesFocusable={canEdit}
              deleteKeyCode={canEdit ? ["Backspace", "Delete"] : null}
              colorMode={theme} fitView fitViewOptions={{ padding: 0.2 }} minZoom={0.2} maxZoom={2} proOptions={{ hideAttribution: true }}
            >
              <Background gap={20} />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable className="!hidden md:!block" />
            </ReactFlow>
          )}
          {single && isDev(single) && <NodePanel key={single.id} node={single.data.dev} canEdit={canEdit} onClose={() => store.onNodesChange([{ id: single.id, type: "select", selected: false }])} />}
          {single && isGroup(single) && (
            <aside aria-label="Group details" className="absolute right-3 top-3 z-10 w-64 space-y-2 rounded-lg border bg-background p-3 shadow-md">
              <label className="block text-xs text-muted-foreground">Group name
                <input disabled={!canEdit} className="mt-1 h-8 w-full rounded-md border bg-background px-2 text-sm text-foreground" value={single.data.group.name} onChange={(e) => store.renameGroup(single.id, e.target.value)} /></label>
              <p className="text-xs text-muted-foreground">Nodes inside move together with the group. Use Ungroup in the toolbar to release them.</p>
            </aside>
          )}
        </div>
      </ReactFlowProvider>
      {filtersActive(store.filters) && shown === 0 && <p className="sr-only" role="status">No nodes match the current filters.</p>}
    </div>
  );
}
