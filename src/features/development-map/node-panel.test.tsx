import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { setMockLatency } from "@/services/mock";
import type { DevMap, DevNode } from "@/types";
import { isDev, useMapStore } from "./map-store";
import { NodePanel } from "./node-panel";

const node: DevNode = {
  id: "a", projectId: "p2", type: "task", title: "Write API docs", description: "", status: "todo", priority: "medium", assigneeId: null, startDate: null, dueDate: null,
  progress: 0, labels: [], checklist: [{ id: "c1", text: "Outline", done: false }, { id: "c2", text: "Draft", done: false }], comments: [], attachments: [], activity: [],
  taskId: null, groupId: null, position: { x: 0, y: 0 }, deletedAt: null,
};
const map: DevMap = { projectId: "p2", version: 1, groups: [], edges: [], nodes: [node], updatedAt: "" };

function Harness({ canEdit }: { canEdit: boolean }) {
  const n = useMapStore((s) => s.nodes.filter(isDev)[0]?.data.dev);
  return n ? <NodePanel node={n} canEdit={canEdit} onClose={() => {}} /> : null;
}
const renderPanel = (canEdit = true) =>
  render(<QueryClientProvider client={new QueryClient()}><Harness canEdit={canEdit} /></QueryClientProvider>);

beforeAll(() => setMockLatency(0));
beforeEach(() => useMapStore.getState().load(map));
afterEach(cleanup);

describe("NodePanel", () => {
  it("updates status and records it in the activity history", () => {
    renderPanel();
    fireEvent.change(screen.getAllByRole("combobox").find((s) => (s as HTMLSelectElement).value === "todo")!, { target: { value: "blocked" } });
    const saved = useMapStore.getState().serialize().nodes[0]!;
    expect(saved.status).toBe("blocked");
    expect(saved.activity[0]?.message).toMatch(/Blocked/);
    expect(screen.getByText(/changed status to Blocked/)).toBeTruthy();
  });
  it("derives progress from the checklist", () => {
    renderPanel();
    fireEvent.click(screen.getByRole("checkbox", { name: "Outline" }));
    expect(useMapStore.getState().serialize().nodes[0]?.progress).toBe(50);
  });
  it("is read-only for viewers", () => {
    renderPanel(false);
    expect((screen.getByLabelText("Title") as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByLabelText("New comment")).toBeNull();
  });
});
