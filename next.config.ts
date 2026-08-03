import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@transhola/ui"],
  experimental: {
    externalDir: true,
  },
};

export default nextConfig;
