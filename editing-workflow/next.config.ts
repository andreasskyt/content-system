import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@remotion/renderer",
    "@remotion/bundler",
    "puppeteer-core",
    "esbuild",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "4gb",
    },
  },
};

export default nextConfig;
