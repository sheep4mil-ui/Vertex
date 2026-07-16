import type { NextConfig } from "next";
const onGitHubPages = process.env.GITHUB_ACTIONS === "true";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  images: { unoptimized: true },
  basePath: onGitHubPages ? "/Vertex" : "",
  assetPrefix: onGitHubPages ? "/Vertex/" : undefined,
  outputFileTracingRoot: process.cwd()
};
export default nextConfig;
