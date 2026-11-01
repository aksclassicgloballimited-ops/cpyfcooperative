import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { IdCardError, getMemberOverview } from "@/lib/idcard";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  if (user.role !== "MEMBER") return NextResponse.json({ error: "Access denied" }, { status: 403 });
  try {
    return NextResponse.json(await getMemberOverview(user.id), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof IdCardError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Unable to load ID card" }, { status: 500 });
  }
}
