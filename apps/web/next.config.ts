import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle so staging can run it in a container (ADR-001).
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
