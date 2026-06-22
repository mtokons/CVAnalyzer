import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Packages that must run in Node.js (not bundled) — used in API routes
  serverExternalPackages: ["pdf-parse", "mammoth", "playwright", "pdfkit"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.linkedin.com" },
      { protocol: "https", hostname: "**.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
