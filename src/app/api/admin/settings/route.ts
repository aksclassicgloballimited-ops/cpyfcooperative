import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { ensureCategoryConfigs } from "@/lib/membership";
import { can } from "@/lib/permissions";

async function requireAdmin(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user || !can(user.role, "settings")) return null;
  return user;
}

export async function GET(request: Request) {
  if (!await requireAdmin(request)) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const categories = await ensureCategoryConfigs();
  const settings = await prisma.cooperativeSetting.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json({ categories, settings });
}

export async function PUT(request: Request) {
  const user = await requireAdmin(request);
  if (!user) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  try {
    const body = await request.json();
    if (!body?.grade || !["ACTIVE", "SILVER", "GOLDEN"].includes(body.grade)) {
      return NextResponse.json({ error: "A valid member category is required" }, { status: 400 });
    }
    const values = {
      displayName: String(body.displayName || "").trim(),
      durationYears: Number(body.durationYears),
      loanMultiplier: Number(body.loanMultiplier),
      minMembershipMonths: Number(body.minMembershipMonths),
      minimumSavings: Number(body.minimumSavings || 0),
      automaticClassification: Boolean(body.automaticClassification),
      updatedBy: user.id,
    };
    if (!values.displayName || !Number.isFinite(values.durationYears) || values.durationYears < 0 ||
      !Number.isFinite(values.loanMultiplier) || values.loanMultiplier <= 0 ||
      !Number.isInteger(values.minMembershipMonths) || values.minMembershipMonths < 0 ||
      !Number.isFinite(values.minimumSavings) || values.minimumSavings < 0) {
      return NextResponse.json({ error: "Category settings contain invalid values" }, { status: 400 });
    }

    const category = await prisma.membershipCategoryConfig.upsert({
      where: { grade: body.grade },
      update: values,
      create: { grade: body.grade, ...values },
    });
    return NextResponse.json({ category });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Settings update failed" }, { status: 500 });
  }
}
