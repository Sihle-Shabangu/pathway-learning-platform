import type { NextConfig } from "next";

// Cache Components is intentionally OFF: every page here reads the session cookie
// and shows per-user data, so pages are rendered per request (the "previous model").
const nextConfig: NextConfig = {
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
