import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @react-pdf/renderer uses Node.js internals — keep it server-only
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
