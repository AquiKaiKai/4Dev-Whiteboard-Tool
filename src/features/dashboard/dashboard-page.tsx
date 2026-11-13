import { Link } from "react-router-dom";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Avatar, Badge, Card, MockNotice, ProgressBar } from "@/components/common/primitives";
import { useProjects } from "@/features/projects/queries";
import { useTasks } from "@/features/tasks/queries";
import { useUsers } from "@/features/team/queries";
import { fmtDate } from "@/utils/dates";
import { statusLabel, statusTone } from "@/utils/labels";
import { useActivity } from "./queries";
import { computeStats, upcomingDeadlines, workloadByUser } from "./stats";

export function DashboardPage() {
  const projects = useProjects();
  const tasks = useTasks();
  const users = useUsers();
  const activity = useActivity();
  const failed = [projects, tasks, users, activity].find((q) => q.isError);

  if (failed?.error)
    return (
      <div role="alert" className="p-6">
        <p className="text-destructive">{failed.error.message}</p>
        <button className="mt-2 text-primary hover:underline" onClick={() => [projects, tasks, users, activity].forEach((q) => void q.refetch())}>Try again</button>
      </div>
    );
  if (!projects.data || !tasks.data || !users.data || !activity.data)
    return <p role="status" className="p-6 text-muted-foreground">Loading...</p>;

  const name = (id: string) => users.data.find((u) => u.id === id)?.name ?? id;
  const project = (id: string) => projects.data.find((p) => p.id === id);
  const s = computeStats(projects.data, tasks.data);
  const tiles: [string, number, boolean?][] = [
    ["Total projects", s.totalProjects], ["Active projects", s.activeProjects], ["Completed projects", s.completedProjects],
    ["Pending tasks", s.pendingTasks], ["In progress", s.inProgressTasks], ["Overdue tasks", s.overdueTasks, s.overdueTasks > 0],
  ];
  const recent = projects.data.filter((p) => p.status !== "archived").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 4);
  const load = workloadByUser(users.data, tasks.data);
  const maxOpen = Math.max(1, ...load.map((l) => l.open));

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <div><h2 className="text-lg font-semibold">Dashboard</h2><MockNotice /></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {tiles.map(([label, value, warn]) => (
          <Card key={label} className="p-3"><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 text-2xl font-semibold ${warn ? "text-status-danger" : ""}`}>{value}</p></Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <div className="mb-3 flex items-center"><h3 className="mr-auto font-medium">Recent projects</h3><Link to="/projects" className="text-primary hover:underline">View all</Link></div>
          <ul className="space-y-3">
            {recent.map((p) => (
              <li key={p.id}>
                <Link to={`/projects/${p.id}`} className="block rounded-md p-2 hover:bg-accent/50">
                  <div className="mb-1.5 flex items-center gap-2"><span className="mr-auto font-medium">{p.name}</span><Badge tone={statusTone[p.status]}>{statusLabel[p.status]}</Badge><span className="w-9 text-right text-xs text-muted-foreground">{p.progress}%</span></div>
                  <ProgressBar value={p.progress} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 font-medium">Upcoming deadlines</h3>
          {upcomingDeadlines(tasks.data).length === 0 ? <p className="text-muted-foreground">No upcoming deadlines.</p> : (
            <ul className="space-y-2">
              {upcomingDeadlines(tasks.data).map((t) => (
                <li key={t.id}><p>{t.title}</p><p className="text-xs text-muted-foreground">{project(t.projectId)?.code} · due {fmtDate(t.dueDate)}</p></li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-4 lg:col-span-2">
          <h3 className="mb-3 font-medium">Developer workload</h3>
          <ul className="space-y-2.5">
            {load.map(({ user, open, completed }) => (
              <li key={user.id} className="flex items-center gap-3">
                <Avatar name={user.name} /><span className="w-36 truncate">{user.name}</span>
                <div className="flex-1"><ProgressBar value={(open / maxOpen) * 100} /></div>
                <span className="w-28 text-right text-xs text-muted-foreground">{open} open · {completed} done</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 font-medium">Recent activity</h3>
          <ul className="space-y-2.5">
            {activity.data.map((a) => (
              <li key={a.id} className="text-sm"><span className="font-medium">{name(a.actorId)}</span> {a.message}<p className="text-xs text-muted-foreground">{formatDistanceToNow(parseISO(a.at), { addSuffix: true })}</p></li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
