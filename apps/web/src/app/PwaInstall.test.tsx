import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PwaInstall from "./PwaInstall";

const originalMatchMedia = Object.getOwnPropertyDescriptor(window, "matchMedia");
const originalUserAgent = Object.getOwnPropertyDescriptor(navigator, "userAgent");
const originalPlatform = Object.getOwnPropertyDescriptor(navigator, "platform");
const originalMaxTouchPoints = Object.getOwnPropertyDescriptor(navigator, "maxTouchPoints");
const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");

function restoreProperty(target: object, key: PropertyKey, descriptor: PropertyDescriptor | undefined) {
  if (descriptor) Object.defineProperty(target, key, descriptor);
  else Reflect.deleteProperty(target, key);
}

function mockBrowser({
  userAgent = "Mozilla/5.0 Chrome/130.0.0.0",
  platform = "Linux",
  standalone = false,
}: {
  userAgent?: string;
  platform?: string;
  standalone?: boolean;
} = {}) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({ matches: standalone })),
  });
  Object.defineProperty(navigator, "userAgent", { configurable: true, value: userAgent });
  Object.defineProperty(navigator, "platform", { configurable: true, value: platform });
  Object.defineProperty(navigator, "maxTouchPoints", { configurable: true, value: 0 });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { register: vi.fn().mockResolvedValue(undefined) },
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  restoreProperty(window, "matchMedia", originalMatchMedia);
  restoreProperty(navigator, "userAgent", originalUserAgent);
  restoreProperty(navigator, "platform", originalPlatform);
  restoreProperty(navigator, "maxTouchPoints", originalMaxTouchPoints);
  restoreProperty(navigator, "serviceWorker", originalServiceWorker);
});

describe("PWA install controls", () => {
  it("registers the offline fallback and invokes the browser install prompt", async () => {
    mockBrowser();
    const prompt = vi.fn().mockResolvedValue(undefined);
    const userChoice = Promise.resolve({ outcome: "accepted" as const, platform: "web" });
    render(<PwaInstall />);

    await waitFor(() => {
      expect(navigator.serviceWorker.register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
    });

    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, { prompt, userChoice });
    window.dispatchEvent(event);
    fireEvent.click(await screen.findByRole("button", { name: "Install" }));

    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByRole("complementary", { name: "Install Webubble" })).toBeNull());
  });

  it("explains how to add Webubble to the iOS Home Screen", async () => {
    mockBrowser({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" });
    render(<PwaInstall />);

    fireEvent.click(await screen.findByRole("button", { name: "How to install" }));

    expect(screen.getByRole("status").textContent).toContain("tap Share");
  });

  it("allows dismissing the iOS installation instructions", async () => {
    mockBrowser({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)" });
    render(<PwaInstall />);

    fireEvent.click(await screen.findByRole("button", { name: "Dismiss install prompt" }));

    expect(screen.queryByRole("complementary", { name: "Install Webubble" })).toBeNull();
  });

  it("does not show an install prompt when already installed", () => {
    mockBrowser({ standalone: true });
    render(<PwaInstall />);

    expect(screen.queryByRole("complementary", { name: "Install Webubble" })).toBeNull();
  });
});
