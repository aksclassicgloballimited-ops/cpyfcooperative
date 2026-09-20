import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { can } from "@/lib/permissions";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user || !can(user.role, "reports")) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const type = params.get("type") || "transactions";
  const from = params.get("from") ? new Date(params.get("from") as string) : undefined;
  const to = params.get("to") ? new Date(`${params.get("to")}T23:59:59.999Z`) : undefined;
  const whereDate = from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {};

  if (type === "members") {
    const rows = await prisma.user.findMany({ where: { createdAt: whereDate.createdAt }, include: { membership: true }, orderBy: { createdAt: "desc" } });
    return reportResponse(type, ["Member", "Email", "Membership No", "Grade", "Category", "Status", "Joined"], rows.map((row) => [ `${row.firstName} ${row.lastName}`, row.email, row.membership?.membershipNo || "", row.membership?.grade || "", row.membership?.category || "", row.membership?.status || "", row.membership?.joinedAt?.toISOString() || "" ]), params);
  }
  if (type === "loans") {
    const rows = await prisma.loanApplication.findMany({ where: { ...whereDate, ...(params.get("status") ? { status: params.get("status") as never } : {}), ...(params.get("loanType") ? { type: params.get("loanType") as never } : {}) }, include: { user: true }, orderBy: { createdAt: "desc" } });
    return reportResponse(type, ["Application", "Member", "Type", "Amount", "Status", "Created"], rows.map((row) => [ row.applicationNo, `${row.user.firstName} ${row.user.lastName}`, row.type, String(row.amount), row.status, row.createdAt.toISOString() ]), params);
  }
  const rows = await prisma.transaction.findMany({ where: whereDate, include: { user: true }, orderBy: { createdAt: "desc" } });
  return reportResponse(type, ["Reference", "Member", "Type", "Description", "Amount", "Status", "Balance", "Date"], rows.map((row) => [ row.reference, `${row.user.firstName} ${row.user.lastName}`, row.type, row.description, String(row.amount), row.status, String(row.balanceAfter ?? ""), row.createdAt.toISOString() ]), params);
}

function reportResponse(type: string, headers: string[], rows: string[][], params: URLSearchParams) {
  const csv = [headers, ...rows].map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
  if (params.get("format") === "csv") return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename=${type}-report.csv` } });
  return NextResponse.json({ type, headers, rows });
}
