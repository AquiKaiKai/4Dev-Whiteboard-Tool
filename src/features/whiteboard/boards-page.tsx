import { useOutletContext } from "react-router-dom";
import type { Project } from "@/types";
import { BoardList } from "./board-list";

export const BoardsPage = () => (
  <div className="mx-auto max-w-6xl p-4 md:p-6"><BoardList heading /></div>
);

export function ProjectBoards() {
  const { project } = useOutletContext<{ project: Project }>();
  return <BoardList projectId={project.id} />;
}
