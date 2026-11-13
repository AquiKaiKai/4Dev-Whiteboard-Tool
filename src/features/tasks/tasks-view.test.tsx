import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMockLatency } from "@/services/mock";
import { useSessionStore } from "@/stores/session-store";
import { TasksView } from "./tasks-view";

const renderView = (props: { projectId?: string; mine?: boolean } = { projectId: "p2" }) =>
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><TasksView {...props} /></MemoryRouter></QueryClientProvider>);

beforeAll(() => setMockLatency(0));
afterEach(cleanup);

describe("TasksView", () => {
  it("shows the six Kanban columns and moves a task between them", async () => {
    useSessionStore.setState({ role: "owner" });
    renderView();
    const card = await screen.findByText("Project list and forms");
    const column = (name: string) => screen.getByRole("region", { name });
    expect(within(column("In progress")).getByText("Project list and forms")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Blocked" })).toBeNull();
    fireEvent.change(within(card.closest("li")!).getByRole("combobox"), { target: { value: "testing" } });
    await waitFor(() => expect(within(column("Testing")).getByText("Project list and forms")).toBeTruthy());
    expect(within(column("In progress")).queryByText("Project list and forms")).toBeNull();
  });
  it("reveals blocked tasks on request and switches to the list view", async () => {
    useSessionStore.setState({ role: "owner" });
    renderView();
    await screen.findByText("Project list and forms");
    fireEvent.click(screen.getByLabelText(/show blocked and cancelled/i));
    expect(within(screen.getByRole("region", { name: "Blocked" })).getByText("Auth integration plan")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "List" }));
    expect(screen.getByRole("columnheader", { name: /deadline/i })).toBeTruthy();
  });
  it("opens the detail panel, and subtasks drive progress", async () => {
    useSessionStore.setState({ role: "owner" });
    renderView();
    fireEvent.click(await screen.findByText("Project list and forms"));
    const panel = await screen.findByRole("complementary", { name: "Task details" });
    expect(within(panel).getByText(/Progress: 50%/)).toBeTruthy();
    fireEvent.click(within(panel).getByRole("checkbox", { name: "Archive flow" }));
    await waitFor(() => expect(within(panel).getByText(/Progress: 75%/)).toBeTruthy());
  });
  it("shows only my tasks in My tasks", async () => {
    useSessionStore.setState({ role: "owner", userId: "u1" });
    renderView({ mine: true });
    await screen.findByText("App shell and routing");
    expect(screen.queryByText("Project list and forms")).toBeNull();
  });
  it("is read-only for viewers", async () => {
    useSessionStore.setState({ role: "viewer", userId: "u1" });
    renderView();
    await screen.findByText("Project list and forms");
    expect(screen.queryByRole("button", { name: /new task/i })).toBeNull();
    expect(screen.queryByRole("combobox", { name: /move project list/i })).toBeNull();
  });
});
