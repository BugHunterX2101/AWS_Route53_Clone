/** @type {import('next').NextConfig} */

// BACKEND_URL is a server-side variable (no NEXT_PUBLIC_ prefix).
// On Render, it is injected automatically via render.yaml fromService.
// Locally it falls back to http://localhost:8000.
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

const nextConfig = {
  // Proxy all /api/v1/* requests to the FastAPI backend.
  // This keeps auth cookies working cross-origin on every environment.
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
    ];
  },

  // Allow Next.js image optimisation to pull from the backend origin.
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
