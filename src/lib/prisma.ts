import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getRuntimeDatabaseUrl() {
  const configuredUrl = process.env.DATABASE_URL;
  if (!configuredUrl) return undefined;

  try {
    const url = new URL(configuredUrl);
    const isSupabasePooler = url.hostname.includes("pooler") || url.port === "6543";
    if (isSupabasePooler) {
      url.searchParams.set("pgbouncer", "true");
      if (!url.searchParams.has("connection_limit")) {
        url.searchParams.set("connection_limit", "1");
      }
      return url.toString();
    }
  } catch {
    return configuredUrl;
  }

  return configuredUrl;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(getRuntimeDatabaseUrl()
      ? { datasources: { db: { url: getRuntimeDatabaseUrl() } } }
      : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
