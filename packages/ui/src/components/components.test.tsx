import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Alert, Button, TextField } from "../index";

afterEach(cleanup);

// jsdom cannot compute colours, so contrast is covered by contrast.test.ts instead.
async function expectNoAxeViolations(container: HTMLElement) {
  const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

describe("Button", () => {
  it("calls onClick when pressed", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Continue</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Continue</Button>);
    expect(screen.getByRole("button").getAttribute("type")).toBe("button");
  });

  it("blocks repeat presses and announces a busy state while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading loadingLabel="Creating account" onClick={onClick}>
        Create account
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Creating account" });
    expect(button).toHaveProperty("disabled", true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Button variant="secondary">Cancel</Button>);
    await expectNoAxeViolations(container);
  });
});

describe("TextField", () => {
  it("is reachable by its label", () => {
    render(<TextField label="Phone number" type="tel" />);
    expect(screen.getByLabelText("Phone number").getAttribute("type")).toBe("tel");
  });

  it("links the hint to the input", () => {
    render(<TextField label="Phone number" hint="We'll text you a code" />);
    const input = screen.getByLabelText("Phone number");
    expect(screen.getByText("We'll text you a code").id).toBe(input.getAttribute("aria-describedby"));
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("marks the input invalid and links both hint and error", () => {
    render(<TextField label="Phone number" hint="Nigerian number" error="Enter an 11-digit number" />);
    const input = screen.getByLabelText("Phone number");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy = input.getAttribute("aria-describedby")?.split(" ") ?? [];
    expect(describedBy).toHaveLength(2);
    expect(describedBy).toContain(screen.getByText("Enter an 11-digit number").id);
  });

  it("keeps generated ids unique across fields", () => {
    render(
      <>
        <TextField label="First name" hint="As on your ID" />
        <TextField label="Last name" hint="As on your ID" />
      </>,
    );
    const ids = screen.getAllByRole("textbox").map((el) => el.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("has no accessibility violations, valid or invalid", async () => {
    const { container } = render(
      <form>
        <TextField label="Email" type="email" required hint="Optional for buyers" />
        <TextField label="Password" type="password" error="Use at least 8 characters" />
      </form>,
    );
    await expectNoAxeViolations(container);
  });
});

describe("Alert", () => {
  it("announces errors immediately", () => {
    render(<Alert tone="error">Payment failed</Alert>);
    expect(screen.getByRole("alert").textContent).toContain("Payment failed");
  });

  it("announces success politely", () => {
    render(<Alert tone="success" title="Saved">Your shop is live</Alert>);
    expect(screen.getByRole("status").textContent).toContain("Your shop is live");
  });

  it("has no accessibility violations", async () => {
    const { container } = render(<Alert tone="info">Delivery takes 1–2 days</Alert>);
    await expectNoAxeViolations(container);
  });
});
