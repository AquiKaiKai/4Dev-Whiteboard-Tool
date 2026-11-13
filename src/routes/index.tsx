import { Activity, BarChart3, CalendarRange, type LucideIcon } from "lucide-react";
import { lazy, Suspense } from "react";
import { createBrowserRouter, Link, type RouteObject } from "react-router-dom";
import { PagePlaceholder } from "@/components/common/page-placeholder";
import { AppShell } from "@/components/layout/app-shell";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import { MapsPage } from "@/features/development-map/maps-page";
import { ProjectLayout, ProjectOverview } from "@/features/projects/project-layout";
import { ProjectsPage } from "@/features/projects/projects-page";
import { MyTasksPage, ProjectTasks } from "@/features/tasks/tasks-pages";
import { SettingsPage } from "@/features/settings/settings-page";
import { TeamPage } from "@/features/team/team-page";
import { BoardsPage, ProjectBoards } from "@/features/whiteboard/boards-page";

// Fabric.js and React Flow are large, so each editor loads only when opened.
const BoardEditorPage = lazy(() => import("@/features/whiteboard/board-editor-page").then((m) => ({ default: m.BoardEditorPage })));
const ProjectMapPage = lazy(() => import("@/features/development-map/project-map-page").then((m) => ({ default: m.ProjectMapPage })));
const loading = <p role="status" className="p-6 text-muted-foreground">Loading editor...</p>;

const page = (icon: LucideIcon, title: string, description: string, phase: number) => (
  <PagePlaceholder icon={icon} title={title} description={description} phase={phase} />
);
const leaf = (path: string, title: string, element: JSX.Element): RouteObject => ({ path, element, handle: { title } });

function NotFound() {
  return (
    <div className="grid h-full place-items-center p-6 text-center">
      <div>
        <h2 className="text-base font-semibold">Page not found</h2>
        <p className="mt-1 text-muted-foreground">This address doesn't match any page.</p>
        <Link to="/" className="mt-3 inline-block text-primary hover:underline">Go to dashboard</Link>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    handle: { title: "Workspace" },
    children: [
      leaf("", "Dashboard", <DashboardPage />),
      {
        path: "projects",
        handle: { title: "Projects" },
        children: [
          { index: true, element: <ProjectsPage /> },
          {
            path: ":projectId",
            handle: { title: "Project", entity: "project" },
            children: [
              {
                element: <ProjectLayout />,
                children: [
                  { index: true, element: <ProjectOverview />, handle: { title: "Overview" } },
                  leaf("boards", "Boards", <ProjectBoards />),
                  leaf("tasks", "Tasks", <ProjectTasks />),
                  leaf("timeline", "Timeline", page(CalendarRange, "Timeline", "Phases, milestones and delayed work.", 6)),
                  leaf("analytics", "Analytics", page(BarChart3, "Analytics", "Completion and workload for this project.", 6)),
                ],
              },
              leaf("map", "Development map", <Suspense fallback={loading}><ProjectMapPage /></Suspense>),
            ],
          },
        ],
      },
      leaf("tasks", "My Tasks", <MyTasksPage />),
      leaf("maps", "Development Maps", <MapsPage />),
      {
        path: "whiteboards",
        handle: { title: "Whiteboards" },
        children: [
          { index: true, element: <BoardsPage /> },
          { path: ":boardId", element: <Suspense fallback={loading}><BoardEditorPage /></Suspense>, handle: { title: "Board", entity: "board" } },
        ],
      },
      leaf("team", "Team", <TeamPage />),
      leaf("activity", "Activity", page(Activity, "Activity", "A feed of recent changes across projects.", 7)),
      leaf("settings", "Settings", <SettingsPage />),
      { path: "*", element: <NotFound />, handle: { title: "Not found" } },
    ],
  },
]);
