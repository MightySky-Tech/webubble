import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CataloguePage from "./page";

const card = {
  id: 5,
  category: "Fashion & fabrics",
  name: "Everyday Ankara tote",
  description: "A sample handmade-goods concept for review.",
  icon: "👜",
  position: 30,
  currency: "NGN",
  price_minor: 4800000,
  stock_quantity: 7,
  seller_name: "Demo Fashion Studio",
  seller_claim: "Fictional seller profile for design review.",
  preview_only: true,
  demo_data: true,
};
const produceCard = {
  id: 8,
  category: "Fresh produce",
  name: "Seasonal citrus mix",
  description: "A sample produce concept.",
  icon: "🍊",
  position: 20,
  currency: "NGN",
  price_minor: 325000,
  stock_quantity: 12,
  seller_name: "Demo Produce Stand",
  seller_claim: "Fictional seller profile for design review.",
  preview_only: true,
  demo_data: true,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("catalogue preview editor", () => {
  it("shows owner-review examples and edits a shared preview card", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { catalogue: [card, produceCard] } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { card: { ...card, name: "Local market tote" } } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        data: { catalogue: [{ ...card, name: "Local market tote" }, produceCard] },
      })));
    vi.stubGlobal("fetch", fetchMock);
    render(<CataloguePage />);

    expect(await screen.findByRole("heading", { name: "Catalogue ideas" })).toBeDefined();
    expect(screen.getByText(/every price, stock count, seller name and seller blurb is fictional demo data/i)).toBeDefined();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search catalogue ideas" }), {
      target: { value: "citrus" },
    });
    expect(screen.getByRole("heading", { name: "Seasonal citrus mix" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Everyday Ankara tote" })).toBeNull();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search catalogue ideas" }), {
      target: { value: "" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    fireEvent.change(screen.getByLabelText(/Idea or product name/), {
      target: { value: "Local market tote" },
    });
    fireEvent.change(screen.getByLabelText(/Demo price \(NGN\)/), {
      target: { value: "52000" },
    });
    fireEvent.change(screen.getByLabelText(/Demo stock quantity/), {
      target: { value: "11" },
    });
    fireEvent.change(screen.getByLabelText(/Fictional seller name/), {
      target: { value: "Demo Local Studio" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[1][0]).toBe("/api/catalogue-preview/5");
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({
      method: "PUT",
      body: expect.stringContaining("Local market tote"),
    }));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toEqual(expect.objectContaining({
      price_minor: 5200000,
      stock_quantity: 11,
      seller_name: "Demo Local Studio",
      seller_claim: expect.any(String),
    }));
    expect(await screen.findByText("Catalogue idea updated.")).toBeDefined();
  });
});
