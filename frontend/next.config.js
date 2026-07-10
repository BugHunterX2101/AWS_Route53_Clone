/** @type {import('next').NextConfig} */

// On Render, BACKEND_URL is injected via render.yaml fromService as a bare hostname.
// Locally it defaults to http://localhost:8000.
const rawBackend = process.env.BACKEND_URL || "http://localhost:8000";
const BACKEND_URL = rawBackend.startsWith("http")
  ? rawBackend
  : `https://${rawBackend}`;

const nextConfig = {
  // Skip ESLint during `next build` — we already run it locally.
  // On Render's free tier this saves ~200MB RAM and prevents lint-related build failures.
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Skip TypeScript type-checking during `next build` — verified locally already.
  // The tsc step uses significant memory that can OOM the free tier.
  typescript: {
    ignoreBuildErrors: true,
  },

  // Proxy all /api/v1/* requests to the FastAPI backend.
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.onrender.com",
      },
    ],
  },
};

module.exports = nextConfig;
