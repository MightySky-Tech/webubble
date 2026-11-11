import type { Metadata, Viewport } from "next";
import "@webubble/ui/tokens.css";
import "@webubble/ui/styles.css";
import "./globals.css";
import PwaInstall from "./PwaInstall";

export const metadata: Metadata = {
  title: "Webubble",
  description: "Buy and sell locally on Webubble.",
  applicationName: "Webubble",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.jpg", type: "image/jpeg", sizes: "640x640" },
      { url: "/webubble-icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/webubble-icon-512.png", type: "image/png", sizes: "512x512" },
      { url: "/webubble-icon.svg", type: "image/svg+xml", sizes: "any" },
    ],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Webubble",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#315d49",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-NG">
      <body>
        {children}
        <PwaInstall />
      </body>
    </html>
  );
}
