import type { NextConfig } from "next";

/**
 * Next.js configuration for Cognure.
 *
 * - `reactCompiler`: enabled by create-next-app. It auto-optimizes React
 *   components so we write less manual memoization code.
 * - `serverExternalPackages`: tells Next.js NOT to bundle these packages and
 *   instead load them normally on the server at runtime. `pdf-parse` (and its
 *   dependency `pdfjs-dist`) ships native/worker code that breaks if bundled,
 *   so we mark it as external. This is required for our PDF text extraction.
 */
const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
