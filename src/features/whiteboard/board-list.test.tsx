import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMockLatency } from "@/services/mock";
import { useSessionStore } from "@/stores/session-store";
import { BoardList } from "./board-list";

const renderList = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><BoardList heading /></MemoryRouter>
    </QueryClientProvider>,
  );

beforeAll(() => setMockLatency(0));
afterEach(cleanup);

describe("BoardList", () => {
  it("lets editors create and trash boards, and restore them from the trash view", async () => {
    useSessionStore.setState({ role: "editor" });
    renderList();
    expect(await screen.findByText("System architecture")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: /^trash$/i }).find((b) => b.closest("li"))!);
    fireEvent.click(screen.getByRole("button", { name: /^trash$/i, pressed: false }));
    expect(await screen.findAllByRole("button", { name: /restore/i })).not.toHaveLength(0);
  });
  it("hides board actions from viewers but still lists boards", async () => {
    useSessionStore.setState({ role: "viewer" });
    renderList();
    await screen.findByText("Navigation flows");
    expect(screen.queryByRole("button", { name: /new board/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /rename/i })).toBeNull();
  });
});
