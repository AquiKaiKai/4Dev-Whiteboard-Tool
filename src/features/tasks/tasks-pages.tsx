import { useOutletContext } from "react-router-dom";
import type { Project } from "@/types";
import { TasksView } from "./tasks-view";

export const MyTasksPage = () => <div className="mx-auto max-w-[1400px] p-4 md:p-6"><TasksView mine /></div>;

export function ProjectTasks() {
  const { project } = useOutletContext<{ project: Project }>();
  return <TasksView projectId={project.id} />;
}
