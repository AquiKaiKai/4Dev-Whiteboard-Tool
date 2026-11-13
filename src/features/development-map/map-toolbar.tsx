import { useReactFlow } from "@xyflow/react";
import { Copy, Group, Maximize, Plus, RotateCcw, Trash2, Ungroup } from "lucide-react";
import type { RefObject } from "react";
import { Menu, menuItemClass } from "@/components/common/menu";
import { inputCls } from "@/components/common/primitives";
import { Button } from "@/components/ui/button";
import { useUsers } from "@/features/team/queries";
import { priorityLabel, taskStatusLabel } from "@/utils/labels";
import { edgeKindLabel, edgeKinds, nodeTypeMeta, nodeTypes } from "./constants";
import { filtersActive, noFilters } from "./graph";
import { isDev, isGroup, useMapStore } from "./map-store";

export function MapToolbar({ canEdit, canvas, shown, total }: { canEdit: boolean; canvas: RefObject<HTMLDivElement>; shown: number; total: number }) {
  const s = useMapStore();
  const users = useUsers().data ?? [];
  const rf = useReactFlow();
  const selected = s.nodes.filter((n) => n.selected && !n.hidden);
  const deleted = s.nodes.filter(isDev).filter((n) => n.hidden);
  const group = selected.find(isGroup);

  const add = (type: (typeof nodeTypes)[number]) => {
    const r = canvas.current?.getBoundingClientRect();
    const at = rf.screenToFlowPosition({ x: (r?.left ?? 0) + (r?.width ?? 400) / 2 + (Math.random() - 0.5) * 120, y: (r?.top ?? 0) + (r?.height ?? 300) / 2 + (Math.random() - 0.5) * 120 });
    s.addNode(type, at);
  };
  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
      {canEdit && (
        <Menu trigger={({ toggle }) => <Button size="sm" onClick={toggle} aria-haspopup="menu"><Plus className="h-4 w-4" /> Add node</Button>}>
          {(close) => nodeTypes.map((t) => <button key={t} className={menuItemClass} onClick={() => { add(t); close(); }}>{(() => { const I = nodeTypeMeta[t].icon; return <I className="h-3.5 w-3.5" aria-hidden />; })()} {nodeTypeMeta[t].label}</button>)}
        </Menu>
      )}
      {canEdit && (
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">New links:
          <select aria-label="New link type" className={`${inputCls} w-32`} value={s.linkKind} onChange={(e) => s.setLinkKind(e.target.value as never)}>
            {edgeKinds.map((k) => <option key={k} value={k}>{edgeKindLabel[k]}</option>)}
          </select>
        </label>
      )}
      <input type="search" aria-label="Search nodes" placeholder="Search nodes" className={`${inputCls} w-44`} value={s.filters.query} onChange={(e) => s.setFilters({ query: e.target.value })} />
      <select aria-label="Filter by developer" className={`${inputCls} w-36`} value={s.filters.assigneeId} onChange={(e) => s.setFilters({ assigneeId: e.target.value })}>
        <option value="">All developers</option><option value="unassigned">Unassigned</option>
        {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <select aria-label="Filter by status" className={`${inputCls} w-32`} value={s.filters.status} onChange={(e) => s.setFilters({ status: e.target.value })}>
        <option value="">All statuses</option>{Object.entries(taskStatusLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <select aria-label="Filter by priority" className={`${inputCls} w-32`} value={s.filters.priority} onChange={(e) => s.setFilters({ priority: e.target.value })}>
        <option value="">All priorities</option>{Object.entries(priorityLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      {filtersActive(s.filters) && <><span className="text-xs text-muted-foreground">{shown} of {total} match</span><Button size="sm" variant="ghost" onClick={() => s.setFilters(noFilters)}>Clear</Button></>}
      <div className="ml-auto flex items-center gap-0.5">
        {canEdit && (
          <>
            <Button size="icon" variant="ghost" title="Group selected nodes" aria-label="Group selected nodes" disabled={selected.filter(isDev).length < 2} onClick={() => s.groupSelected()}><Group className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" title="Ungroup" aria-label="Ungroup" disabled={!group} onClick={() => group && s.ungroup(group.id)}><Ungroup className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" title="Duplicate selected" aria-label="Duplicate selected" disabled={!selected.some(isDev)} onClick={() => s.duplicateSelected()}><Copy className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" title="Delete selected (recoverable)" aria-label="Delete selected" disabled={!selected.some(isDev)} onClick={() => s.softDelete(selected.filter(isDev).map((n) => n.id))}><Trash2 className="h-4 w-4" /></Button>
          </>
        )}
        <Menu align="end" className="w-72" trigger={({ toggle }) => <Button size="sm" variant="ghost" onClick={toggle} aria-haspopup="menu"><RotateCcw className="h-3.5 w-3.5" /> Deleted ({deleted.length})</Button>}>
          {(close) => deleted.length === 0 ? <p className="px-3 py-4 text-center text-sm text-muted-foreground">No deleted nodes.</p> : deleted.map((n) => (
            <div key={n.id} className="flex items-center gap-2 px-2 py-1.5 text-sm"><span className="mr-auto truncate">{n.data.dev.title}</span>
              {canEdit && <Button size="sm" variant="outline" onClick={() => { s.restore(n.id); close(); }}>Restore</Button>}</div>
          ))}
        </Menu>
        <Button size="icon" variant="ghost" title="Fit to view" aria-label="Fit to view" onClick={() => void rf.fitView({ padding: 0.2 })}><Maximize className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
