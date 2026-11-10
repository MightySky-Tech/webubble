import type { Metadata } from "next";
import "@webubble/ui/tokens.css";
import "@webubble/ui/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Webubble",
  description: "Buy and sell locally on Webubble.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-NG">
      <body>{children}</body>
    </html>
  );
}
