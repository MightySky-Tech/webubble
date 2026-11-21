import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

import AuthBrand from "./AuthBrand";
import SignInPage from "./sign-in/page";
import SignUpPage from "./sign-up/page";
import VerifyEmailPage from "./verify-email/page";

afterEach(cleanup);

describe("AuthBrand", () => {
  it("shows the Webubble logo as a link to the home page", () => {
    const { container } = render(<AuthBrand />);

    expect(screen.getByRole("link", { name: "Webubble home" }).getAttribute("href")).toBe("/");
    expect(container.querySelector("img")?.getAttribute("src")).toContain("webubble_logo.jpg");
  });

  it.each([
    ["sign-in", SignInPage],
    ["sign-up", SignUpPage],
    ["verify-email", VerifyEmailPage],
  ])("appears on the %s page", (_name, Page) => {
    render(<Page />);

    expect(screen.getByRole("link", { name: "Webubble home" })).toBeTruthy();
  });
});
