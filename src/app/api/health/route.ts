import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    service: "cpyif-platform",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
