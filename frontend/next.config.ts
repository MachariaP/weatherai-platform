import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Keep Turbopack rooted on this app so a parent-directory lockfile is ignored.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
