import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Webubble Admin",
  description: "Webubble operations portal.",
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
