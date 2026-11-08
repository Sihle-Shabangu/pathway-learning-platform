import type { NextConfig } from "next";

// Cache Components is intentionally OFF: every page here reads the session cookie
// and shows per-user data, so pages are rendered per request (the "previous model").
const nextConfig: NextConfig = {
  // Next 16 logs every server action's arguments in dev, which would print login passwords.
  logging: { serverFunctions: false },
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
