import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Home from "./page";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("seller application review", () => {
  it("shows an empty state to an authenticated administrator", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { user: { roles: ["admin"] } } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { applications: [] } }))));
    render(<Home />);

    expect(await screen.findByRole("heading", { level: 1, name: "Seller applications" })).toBeDefined();
    expect(screen.getByText("No applications are waiting for review.")).toBeDefined();
  });
});
