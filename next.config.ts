import type { NextConfig } from "next";

/**
 * Next.js configuration for Cognure.
 *
 * - `serverExternalPackages`: tells Next.js NOT to bundle these packages and
 *   instead load them normally on the server at runtime. `pdf-parse` ships
 *   native/worker code that breaks if bundled, so we mark it as external.
 */
const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
