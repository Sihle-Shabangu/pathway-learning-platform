import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { PrismaClient } from "@/generated/prisma/client";

// The Neon driver talks to Postgres over WebSockets; give it Node's implementation.
neonConfig.webSocketConstructor = ws;

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  }
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({
    adapter,
    // Prisma's defaults (wait 2s to start, 5s to run) are tight for a remote serverless database:
    // a latency spike made "Unable to start a transaction in the given time" errors. Give it more room.
    transactionOptions: { maxWait: 10_000, timeout: 20_000 },
  });
}

// Reuse one client across hot reloads in development so we don't exhaust connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
