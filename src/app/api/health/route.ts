import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      service: "cpyif-platform",
      status: "ok",
      database: "connected",
      databaseUrlConfigured: true,
      directUrlConfigured: Boolean(process.env.DIRECT_URL),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Production database health check failed", error);
    return NextResponse.json(
      {
        service: "cpyif-platform",
        status: "degraded",
        database: "unavailable",
        databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
        directUrlConfigured: Boolean(process.env.DIRECT_URL),
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
