import { formatDistanceToNow, parseISO } from "date-fns";
import { Copy, Pencil, PenTool, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Modal } from "@/components/common/modal";
import { Badge, Card, MockNotice, QueryState, inputCls } from "@/components/common/primitives";
import { Button } from "@/components/ui/button";
import { useProjects } from "@/features/projects/queries";
import { usePermissions } from "@/hooks/use-permissions";
import type { BoardSummary } from "@/types";
import { useBoards, useCreateBoard, useDuplicateBoard, useRenameBoard, useRestoreBoard, useTrashBoard } from "./queries";

type Dialog = { kind: "create" } | { kind: "rename"; board: BoardSummary } | null;

function NameDialog({ dialog, projectId, onClose }: { dialog: NonNullable<Dialog>; projectId?: string; onClose: () => void }) {
  const projects = useProjects();
  const create = useCreateBoard();
  const rename = useRenameBoard();
  const [name, setName] = useState(dialog.kind === "rename" ? dialog.board.name : "");
  const [project, setProject] = useState(projectId ?? "");
  const mutation = dialog.kind === "create" ? create : rename;
  const valid = name.trim().length > 0 && (dialog.kind === "rename" || !!(projectId ?? project));
  const submit = () => {
    if (!valid) return;
    const done = { onSuccess: onClose };
    if (dialog.kind === "create") create.mutate({ projectId: projectId ?? project, name: name.trim() }, done);
    else rename.mutate({ id: dialog.board.id, name: name.trim(), version: dialog.board.version }, done);
  };
  return (
    <Modal title={dialog.kind === "create" ? "New board" : "Rename board"} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <label className="block space-y-1"><span className="text-xs font-medium text-muted-foreground">Name</span>
          <input autoFocus className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Untitled board" /></label>
        {dialog.kind === "create" && !projectId && (
          <label className="block space-y-1"><span className="text-xs font-medium text-muted-foreground">Project</span>
            <select className={inputCls} value={project} onChange={(e) => setProject(e.target.value)}>
              <option value="">Choose a project</option>
              {projects.data?.filter((p) => p.status !== "archived").map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
            </select></label>
        )}
        {mutation.isError && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={!valid || mutation.isPending}>{mutation.isPending ? "Saving..." : "Save"}</Button></div>
      </form>
    </Modal>
  );
}

export function BoardList({ projectId, heading = false }: { projectId?: string; heading?: boolean }) {
  const [trash, setTrash] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const boards = useBoards({ projectId, trashed: trash });
  const projects = useProjects();
  const canEdit = usePermissions()("board.edit");
  const duplicate = useDuplicateBoard();
  const trashBoard = useTrashBoard();
  const restore = useRestoreBoard();
  const code = (id: string) => projects.data?.find((p) => p.id === id)?.code ?? "";
  const error = duplicate.error ?? trashBoard.error ?? restore.error;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto">{heading && <h2 className="text-lg font-semibold">Whiteboards</h2>}<MockNotice /></div>
        <Button variant={trash ? "default" : "outline"} onClick={() => setTrash((t) => !t)} aria-pressed={trash}><Trash2 className="h-4 w-4" /> Trash</Button>
        {canEdit && !trash && <Button onClick={() => setDialog({ kind: "create" })}><Plus className="h-4 w-4" /> New board</Button>}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
      <QueryState query={boards} isEmpty={(d) => d.length === 0} emptyText={trash ? "Trash is empty." : "No boards yet. Create one to start sketching."}>
        {(data) => (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((b) => (
              <li key={b.id}>
                <Card className="flex h-full flex-col">
                  {trash ? <div className="flex-1 p-4"><Name b={b} code={code(b.projectId)} /></div> : (
                    <Link to={`/whiteboards/${b.id}`} className="flex-1 rounded-t-lg p-4 hover:bg-accent/50"><Name b={b} code={code(b.projectId)} /></Link>
                  )}
                  {canEdit && (
                    <div className="flex gap-1 border-t p-1.5">
                      {trash ? <Button size="sm" variant="ghost" disabled={restore.isPending} onClick={() => restore.mutate(b.id)}><RotateCcw className="h-3.5 w-3.5" /> Restore</Button> : (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: "rename", board: b })}><Pencil className="h-3.5 w-3.5" /> Rename</Button>
                          <Button size="sm" variant="ghost" disabled={duplicate.isPending} onClick={() => duplicate.mutate(b.id)}><Copy className="h-3.5 w-3.5" /> Duplicate</Button>
                          <Button size="sm" variant="ghost" className="ml-auto" disabled={trashBoard.isPending} onClick={() => trashBoard.mutate(b.id)}><Trash2 className="h-3.5 w-3.5" /> Trash</Button>
                        </>
                      )}
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
      {dialog && <NameDialog dialog={dialog} projectId={projectId} onClose={() => setDialog(null)} />}
    </div>
  );
}

function Name({ b, code }: { b: BoardSummary; code: string }) {
  return (
    <>
      <div className="mb-3 grid h-20 place-items-center rounded-md bg-muted"><PenTool className="h-6 w-6 text-muted-foreground" aria-hidden /></div>
      <p className="font-medium">{b.name}</p>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">{code && <Badge>{code}</Badge>}<span>Updated {formatDistanceToNow(parseISO(b.updatedAt), { addSuffix: true })}</span></div>
    </>
  );
}
