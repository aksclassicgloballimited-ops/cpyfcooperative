import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { ensureLoanProducts } from "@/lib/loan-products";
import { can } from "@/lib/permissions";

async function staff(request: Request) {
  const user = await getUserFromRequest(request);
  return user && can(user.role, "loans") ? user : null;
}

export async function GET() {
  return NextResponse.json({ products: await ensureLoanProducts() });
}

export async function PUT(request: Request) {
  const user = await staff(request);
  if (!user) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: "Product id is required" }, { status: 400 });
  const product = await prisma.loanProduct.update({
    where: { id: body.id },
    data: {
      name: String(body.name),
      maximumAmount: Number(body.maximumAmount),
      minimumAmount: Number(body.minimumAmount),
      processingFeeValue: Number(body.processingFeeValue),
      processingFeeType: String(body.processingFeeType || "PERCENTAGE"),
      repaymentPeriod: Number(body.repaymentPeriod),
      repaymentFrequency: String(body.repaymentFrequency),
      eligibilityRequirements: String(body.eligibilityRequirements),
      requiredSavings: Number(body.requiredSavings || 0),
      requiredShares: Number(body.requiredShares || 0),
      guarantorRequirements: String(body.guarantorRequirements),
      documentationRequirements: String(body.documentationRequirements),
      terms: String(body.terms),
      active: Boolean(body.active),
    },
  });
  return NextResponse.json({ product });
}

export async function POST(request: Request) {
  const user = await staff(request);
  if (!user) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const body = await request.json();
  const product = await prisma.loanProduct.create({ data: body });
  return NextResponse.json({ product }, { status: 201 });
}
