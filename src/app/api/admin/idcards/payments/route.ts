import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { IdCardError, reviewCardPayment } from "@/lib/idcard";

// Only these roles may verify an ID card payment. There is deliberately no endpoint to mark a card paid without a submitted payment.
const REVIEWERS = ["SUPER_ADMIN", "EXECUTIVE", "FINANCE_OFFICER"];

export async function PUT(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  if (!REVIEWERS.includes(user.role)) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const reason = String(body.reason || "").trim().slice(0, 500);
  if (!body.id || !["APPROVED", "REJECTED"].includes(body.status)) return NextResponse.json({ error: "Payment and decision are required" }, { status: 400 });
  if (body.status === "REJECTED" && reason.length < 3) return NextResponse.json({ error: "A rejection reason is required" }, { status: 400 });
  try {
    await reviewCardPayment(String(body.id), body.status, { id: user.id, role: user.role }, reason);
    return NextResponse.json({ message: body.status === "APPROVED" ? "Payment verified and card issued" : "Payment rejected" });
  } catch (error) {
    if (error instanceof IdCardError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Unable to review payment" }, { status: 500 });
  }
}
