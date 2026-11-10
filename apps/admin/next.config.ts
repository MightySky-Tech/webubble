import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle so staging can run it in a container (ADR-001).
  output: "standalone",
  // Shared design system (WB-002) ships as TypeScript source.
  transpilePackages: ["@webubble/ui"],
  poweredByHeader: false,
};

export default nextConfig;
