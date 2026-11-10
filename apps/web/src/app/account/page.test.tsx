import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

import AccountPage from "./page";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  replace.mockReset();
});

describe("account page", () => {
  it("shows a useful buyer dashboard after authentication", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({
          data: {
            user: {
              id: 1,
              name: "Ada Buyer",
              email: "ada@example.com",
              roles: ["buyer"],
            },
          },
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    render(<AccountPage />);

    expect(await screen.findByRole("heading", { name: "Welcome in, Ada." })).toBeDefined();
    expect(screen.getByText("Orders & deliveries")).toBeDefined();
    expect(screen.getByRole("link", { name: /become a seller/i })).toBeDefined();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeDefined();
  });
});
