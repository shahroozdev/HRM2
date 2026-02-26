import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@hrm/shared", "@hrm/ui"],
};

export default nextConfig;
