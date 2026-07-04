import type { NextConfig } from "next";

// GITHUB_PAGES=true is set by the Pages deploy workflow: it switches the build
// to a static export (out/) served under the repo's base path. Local dev and
// normal builds are unaffected.
const isGithubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  ...(isGithubPages && {
    output: "export" as const,
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
    trailingSlash: true,
    images: { unoptimized: true },
  }),
};

export default nextConfig;
