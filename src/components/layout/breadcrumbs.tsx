import { ChevronRight } from "lucide-react";
import { Link, useMatches } from "react-router-dom";
import { useProject } from "@/features/projects/queries";
import { useBoard } from "@/features/whiteboard/queries";
import type { RouteHandle } from "@/routes/types";

export function Breadcrumbs() {
  const matches = useMatches();
  const projectId = matches.at(-1)?.params.projectId;
  const project = useProject(projectId);
  const board = useBoard(matches.at(-1)?.params.boardId);
  const crumbs = matches
    .filter((m) => (m.handle as RouteHandle | undefined)?.title)
    .map((m) => {
      const h = m.handle as RouteHandle;
      return { title: h.entity === "project" ? (project.data?.name ?? "Project") : h.entity === "board" ? (board.data?.name ?? "Board") : h.title, to: m.pathname };
    });

  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1;
        return (
          <span key={`${c.to}-${i}`} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />}
            {last ? (
              <span className="truncate font-medium" aria-current="page">{c.title}</span>
            ) : (
              <Link to={c.to} className="truncate text-muted-foreground hover:text-foreground">{c.title}</Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
