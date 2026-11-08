import type { NextConfig } from "next";

// Cache Components is intentionally OFF: every page here reads the session cookie
// and shows per-user data, so pages are rendered per request (the "previous model").
const nextConfig: NextConfig = {
  // Next 16 logs every server action's arguments in dev, which would print login passwords.
  logging: { serverFunctions: false },
  // Basic hardening headers for every response.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
