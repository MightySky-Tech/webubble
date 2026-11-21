import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("requires an explicit manual identity approval before approving an informal seller", async () => {
    const application = {
      id: 12,
      seller_type: "informal",
      status: "pending",
      trading_name: "Aunty Ada Snacks",
      phone: "+2348012345678",
      legal_name: null,
      cac_number: null,
      cac_verified: false,
      identity_verification_status: "pending",
      payout_verification_status: "not_started",
      submitted_at: "2026-11-10T12:00:00Z",
      reviewed_at: null,
      review_notes: null,
      user: { id: 8, name: "Ada", email: "ada@example.test" },
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { user: { roles: ["admin"] } } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { applications: [application] } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { seller: application } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { user: { roles: ["admin"] } } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { applications: [] } })));
    vi.stubGlobal("fetch", fetchMock);
    render(<Home />);

    const approveButton = await screen.findByRole("button", { name: "Approve" });
    expect(approveButton).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByRole("combobox", {
      name: "Identity verification status for Aunty Ada Snacks",
    }), { target: { value: "approved" } });
    expect(approveButton).toHaveProperty("disabled", false);
    fireEvent.click(approveButton);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    expect(JSON.parse(fetchMock.mock.calls[2][1].body as string)).toEqual(expect.objectContaining({
      status: "approved",
      identity_verification_status: "approved",
    }));
  });
});
