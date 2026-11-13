import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setMockLatency } from "@/services/mock";
import { useSessionStore } from "@/stores/session-store";
import { ProjectsPage } from "./projects-page";

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><ProjectsPage /></MemoryRouter>
    </QueryClientProvider>,
  );

beforeAll(() => setMockLatency(0));
afterEach(cleanup);

describe("ProjectsPage", () => {
  it("lists projects and offers New project to owners", async () => {
    useSessionStore.setState({ role: "owner" });
    renderPage();
    expect(await screen.findByText("Client Portal Redesign")).toBeTruthy();
    expect(screen.getByRole("button", { name: /new project/i })).toBeTruthy();
  });
  it("hides New project from viewers", async () => {
    useSessionStore.setState({ role: "viewer" });
    renderPage();
    await screen.findByText("Client Portal Redesign");
    expect(screen.queryByRole("button", { name: /new project/i })).toBeNull();
  });
});
