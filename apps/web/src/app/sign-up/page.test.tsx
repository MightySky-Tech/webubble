import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import SignUpPage from "./page";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  push.mockReset();
});

describe("sign-up page", () => {
  it("requests an email code and opens verification", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ message: "If the address is eligible, a verification code has been sent." }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<SignUpPage />);

    fireEvent.change(screen.getByLabelText("Full name", { exact: false }), { target: { value: "A Buyer" } });
    fireEvent.change(screen.getByLabelText("Email address", { exact: false }), { target: { value: "buyer@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/verify-email"));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/otp/request",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "buyer@example.com", intent: "register", name: "A Buyer" }),
      }),
    );
  });

  it("shows API errors instead of advancing the flow", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Too many verification requests." }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    render(<SignUpPage />);

    fireEvent.change(screen.getByLabelText("Full name", { exact: false }), { target: { value: "A Buyer" } });
    fireEvent.change(screen.getByLabelText("Email address", { exact: false }), { target: { value: "buyer@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Too many verification requests.");
    expect(push).not.toHaveBeenCalled();
  });
});
