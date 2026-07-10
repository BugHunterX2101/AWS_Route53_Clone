/** @type {import('next').NextConfig} */

// NOTE: API proxying is handled by app/api/v1/[...path]/route.ts at RUNTIME.
// This is intentional — next.config.js rewrites evaluate BACKEND_URL at BUILD
// time, which causes 404s when the env var is not yet available during build.
// The route.ts handler reads BACKEND_URL at request time, always correctly.

const nextConfig = {
  // Skip ESLint during `next build` — we already run it locally.
  // On Render's free tier this saves ~200MB RAM.
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Skip TypeScript type-checking during `next build` — verified locally.
  typescript: {
    ignoreBuildErrors: true,
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
