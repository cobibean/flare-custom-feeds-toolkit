import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Handle external packages that don't work well with bundling
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
  
  // Required for Next.js 16 with Turbopack
  turbopack: {},
};

export default nextConfig;
