"use client";

import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function PwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const iosDevice = /iPhone|iPad|iPod/i.test(userAgent)
      || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || ("standalone" in navigator && navigator.standalone === true);
    setIsIos(iosDevice);
    setIsInstalled(standalone);

    function handleInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    }

    function handleInstalled() {
      setIsInstalled(true);
      setInstallPrompt(null);
      setShowIosHelp(false);
      setDismissed(true);
    }

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((reason: unknown) => {
        console.error("Webubble offline fallback registration failed.", reason);
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    setError("");
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallPrompt(null);
      if (choice.outcome === "accepted") setIsInstalled(true);
      else setDismissed(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to open the install prompt.");
    }
  }

  if (isInstalled || dismissed || (!installPrompt && !isIos)) return null;

  return (
    <aside className="wb-pwa-install" aria-label="Install Webubble">
      <div className="wb-pwa-install__copy">
        <strong>Take Webubble with you</strong>
        <span>{isIos ? "Add this app to your Home Screen." : "Install the app for quick access."}</span>
      </div>
      {installPrompt ? (
        <button className="wb-pwa-install__action" type="button" onClick={install}>
          Install
        </button>
      ) : (
        <button
          className="wb-pwa-install__action"
          type="button"
          aria-expanded={showIosHelp}
          onClick={() => setShowIosHelp((visible) => !visible)}
        >
          How to install
        </button>
      )}
      {showIosHelp && (
        <p className="wb-pwa-install__help" role="status">
          In Safari, tap Share, then choose “Add to Home Screen”.
        </p>
      )}
      {error && <p className="wb-pwa-install__error" role="alert">{error}</p>}
      <button
        className="wb-pwa-install__dismiss"
        type="button"
        aria-label="Dismiss install prompt"
        onClick={() => setDismissed(true)}
      >
        Not now
      </button>
    </aside>
  );
}
