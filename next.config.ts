import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@solarisdk/browser",
    "@solarisdk/sandbox",
    "@solarisdk/core",
    "patchright-core",
  ],
};

export default nextConfig;
