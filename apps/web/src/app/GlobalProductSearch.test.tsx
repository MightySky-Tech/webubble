import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import GlobalProductSearch from "./GlobalProductSearch";

afterEach(() => {
  cleanup();
  window.history.replaceState({}, "", "/");
});

describe("global product search", () => {
  it("searches live products from the storefront header", async () => {
    window.history.replaceState({}, "", "/?q=rice");
    render(<GlobalProductSearch />);

    const form = screen.getByRole("search");
    const input = await screen.findByRole("searchbox", { name: "Search products and local shops" });

    expect(form.getAttribute("action")).toBe("/products");
    expect(form.getAttribute("method")).toBe("get");
    expect(input).toHaveProperty("name", "q");
    expect(input).toHaveProperty("value", "rice");
    expect(input.getAttribute("maxLength")).toBe("80");
  });
});
