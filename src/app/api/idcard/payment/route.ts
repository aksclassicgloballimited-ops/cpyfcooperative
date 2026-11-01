import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { IdCardError, submitCardPayment } from "@/lib/idcard";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  if (user.role !== "MEMBER") return NextResponse.json({ error: "Access denied" }, { status: 403 });
  try {
    const form = await request.formData();
    const transactionNo = String(form.get("transactionNo") || "").trim().slice(0, 64);
    const receipt = form.get("receipt");
    const hasReceipt = receipt instanceof File && receipt.size > 0;
    if (!transactionNo && !hasReceipt) return NextResponse.json({ error: "Upload a payment receipt or enter the bank transaction number" }, { status: 400 });
    let receiptData: string | null = null;
    if (hasReceipt) {
      if (receipt.size > 150 * 1024) return NextResponse.json({ error: "Receipt must not exceed 150 KB" }, { status: 400 });
      if (!/^(image\/|application\/pdf)/.test(receipt.type)) return NextResponse.json({ error: "Receipt must be an image or PDF" }, { status: 400 });
      receiptData = `data:${receipt.type};base64,${Buffer.from(await receipt.arrayBuffer()).toString("base64")}`;
    }
    // The amount is fixed on the server; nothing from the request can change the fee, dates or membership ID.
    const payment = await submitCardPayment(user.id, { transactionNo: transactionNo || null, receipt: receiptData });
    return NextResponse.json({ payment: { id: payment.id, reference: payment.reference, kind: payment.kind, amount: payment.amount, status: payment.status } }, { status: 201 });
  } catch (error) {
    if (error instanceof IdCardError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Unable to submit ID card payment" }, { status: 500 });
  }
}
