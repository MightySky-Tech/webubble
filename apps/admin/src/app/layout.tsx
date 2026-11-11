import type { Metadata } from "next";
import "@webubble/ui/tokens.css";
import "@webubble/ui/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Webubble Admin",
  description: "Webubble operations portal.",
  icons: {
    icon: [{ url: "/favicon.jpg", type: "image/jpeg", sizes: "640x640" }],
  },
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
