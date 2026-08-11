import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@transhola/ui"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: "standalone",
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
