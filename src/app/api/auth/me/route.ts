import { NextResponse } from "next/server";
import { getSessionUserLocal } from "@/lib/store";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("cpyif_session="));

  const token = cookie ? decodeURIComponent(cookie.split("=")[1] ?? "") : null;
  const user = await getSessionUserLocal(token);

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const { passwordHash, ...safeUser } = user;
  return NextResponse.json({ user: safeUser }, { status: 200 });
}
