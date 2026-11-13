import { GitBranch } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, Card, MockNotice, QueryState } from "@/components/common/primitives";
import { useProjects } from "@/features/projects/queries";
import { statusLabel, statusTone } from "@/utils/labels";
import { useMapSummaries } from "./queries";

export function MapsPage() {
  const projects = useProjects();
  const summaries = useMapSummaries();
  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div><h2 className="text-lg font-semibold">Development maps</h2><MockNotice /></div>
      <QueryState query={projects} isEmpty={(d) => d.length === 0} emptyText="No projects yet.">
        {(data) => (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.filter((p) => p.status !== "archived").map((p) => {
              const count = summaries.data?.find((s) => s.projectId === p.id)?.nodeCount ?? 0;
              return (
                <li key={p.id}>
                  <Link to={`/projects/${p.id}/map`}>
                    <Card className="space-y-2 p-4 hover:bg-accent/50">
                      <div className="flex items-center gap-2"><GitBranch className="h-4 w-4 text-muted-foreground" aria-hidden /><span className="font-medium">{p.name}</span></div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground"><span>{p.code}</span><Badge tone={statusTone[p.status]}>{statusLabel[p.status]}</Badge><span className="ml-auto">{summaries.isPending ? "..." : `${count} nodes`}</span></div>
                    </Card>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </QueryState>
    </div>
  );
}
