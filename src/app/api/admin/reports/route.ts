import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { canViewReport } from "@/lib/permissions";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const type = params.get("type") || "transactions";
  if (!canViewReport(user.role, type)) return NextResponse.json({ error: "You are not allowed to view this report" }, { status: 403 });

  const from = params.get("from") ? new Date(params.get("from") as string) : undefined;
  const to = params.get("to") ? new Date(`${params.get("to")}T23:59:59.999Z`) : undefined;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
    return NextResponse.json({ error: "Invalid report date range" }, { status: 400 });
  }
  const whereDate = from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {};
  const roleFor = async (ids: Array<string | null | undefined>) => {
    const userIds = [...new Set(ids.filter((id): id is string => Boolean(id)))];
    const actors = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, role: true } }) : [];
    return new Map(actors.map((actor) => [actor.id, actor.role]));
  };
  const latestAudit = async (entityType: string, ids: string[]) => {
    if (!ids.length) return new Map<string, { actorRole: string; createdAt: Date }>();
    const entries = await prisma.auditEntry.findMany({
      where: { entityType, entityId: { in: ids } },
      select: { entityId: true, actorRole: true, actor: { select: { role: true } }, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    const latest = new Map<string, { actorRole: string; createdAt: Date }>();
    for (const entry of entries) {
      if (!latest.has(entry.entityId)) latest.set(entry.entityId, { actorRole: entry.actorRole || entry.actor.role, createdAt: entry.createdAt });
    }
    return latest;
  };

  if (type === "members") {
    const rows = await prisma.user.findMany({
      where: { createdAt: whereDate.createdAt, role: "MEMBER" },
      include: { membership: true },
      orderBy: { createdAt: "desc" },
    });
    const audit = await latestAudit("User", rows.map((row) => row.id));
    return reportResponse(type, ["Member", "Email", "Membership No", "Grade", "Category", "Status", "Joined", "Last action role", "Action date"], rows.map((row) => {
      const action = audit.get(row.id);
      return [`${row.firstName} ${row.lastName}`, row.email, row.membership?.membershipNo || "", row.membership?.grade || "", row.membership?.category || "", row.membership?.status || "", row.membership?.joinedAt?.toISOString() || "", action?.actorRole || "", action?.createdAt.toISOString() || ""];
    }), params);
  }

  if (type === "loans") {
    const rows = await prisma.loanApplication.findMany({
      where: { ...whereDate, ...(params.get("status") ? { status: params.get("status") as never } : {}), ...(params.get("loanType") ? { type: params.get("loanType") as never } : {}) },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });
    const audit = await latestAudit("LoanApplication", rows.map((row) => row.id));
    return reportResponse(type, ["Record ID", "Application", "Member", "Type", "Amount", "Status", "Created", "Action role", "Action date"], rows.map((row) => {
      const action = audit.get(row.id);
      return [row.id, row.applicationNo, `${row.user.firstName} ${row.user.lastName}`, row.type, String(row.amount), row.status, row.createdAt.toISOString(), action?.actorRole || "", action?.createdAt.toISOString() || ""];
    }), params);
  }

  if (type === "development") {
    const rows = await prisma.developmentLevy.findMany({
      where: whereDate,
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
    });
    const transactions = rows.flatMap((row) => row.transactionId ? [row.transactionId] : []);
    const actors = transactions.length ? await prisma.transaction.findMany({ where: { id: { in: transactions } }, select: { id: true, actorId: true } }) : [];
    const actorRoles = await roleFor(actors.map((item) => item.actorId));
    const levyAudits = await prisma.auditEntry.findMany({
      where: { entityType: "SavingsPaymentSubmission", entityId: { in: rows.flatMap((row) => row.savingsPaymentId ? [row.savingsPaymentId] : []) } },
      select: { entityId: true, actorRole: true, actor: { select: { role: true } }, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    const roleByPayment = new Map<string, { role: string; createdAt: Date }>();
    for (const entry of levyAudits) if (!roleByPayment.has(entry.entityId)) roleByPayment.set(entry.entityId, { role: entry.actorRole || entry.actor.role, createdAt: entry.createdAt });
    const rolesByTransaction = new Map(actors.map((item) => [item.id, item.actorId ? actorRoles.get(item.actorId) || "" : ""]));
    return reportResponse(type, ["Member", "Membership No", "Category", "Amount", "Week", "Action role", "Action date"], rows.map((row) => {
      const audit = row.savingsPaymentId ? roleByPayment.get(row.savingsPaymentId) : undefined;
      return [`${row.user.firstName} ${row.user.lastName}`, row.membershipNo, row.category, String(row.amount), row.weekStart.toISOString(), audit?.role || rolesByTransaction.get(row.transactionId || "") || "", audit?.createdAt.toISOString() || row.createdAt.toISOString()];
    }), params);
  }

  if (type === "shares") {
    const rows = await prisma.shareTransaction.findMany({
      where: whereDate,
      include: { membership: { include: { user: { select: { firstName: true, lastName: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    const actorRoles = await roleFor(rows.map((row) => row.actorId));
    const audits = await prisma.auditEntry.findMany({
      where: { shareTransactionId: { in: rows.map((row) => row.id) } },
      select: { shareTransactionId: true, actorRole: true, actor: { select: { role: true } }, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    const auditByShare = new Map<string, { role: string; createdAt: Date }>();
    for (const audit of audits) if (audit.shareTransactionId && !auditByShare.has(audit.shareTransactionId)) auditByShare.set(audit.shareTransactionId, { role: audit.actorRole || audit.actor.role, createdAt: audit.createdAt });
    return reportResponse(type, ["Member", "Type", "Units", "Unit price", "Description", "Reference", "Action role", "Action date"], rows.map((row) => {
      const audit = auditByShare.get(row.id);
      return [`${row.membership.user.firstName} ${row.membership.user.lastName}`, row.type, String(row.units), String(row.unitPrice), row.description, row.reference, audit?.role || (row.actorId ? actorRoles.get(row.actorId) || "" : ""), audit?.createdAt.toISOString() || row.createdAt.toISOString()];
    }), params);
  }

  const rows = await prisma.transaction.findMany({ where: whereDate, include: { user: true }, orderBy: { createdAt: "desc" } });
  const actorRoles = await roleFor(rows.map((row) => row.actorId));
  const transactionAudits = await prisma.auditEntry.findMany({
    where: { transactionId: { in: rows.map((row) => row.id) } },
    select: { transactionId: true, actorRole: true, actor: { select: { role: true } }, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  const actionByTransaction = new Map<string, { role: string; createdAt: Date }>();
  for (const audit of transactionAudits) if (audit.transactionId && !actionByTransaction.has(audit.transactionId)) actionByTransaction.set(audit.transactionId, { role: audit.actorRole || audit.actor.role, createdAt: audit.createdAt });
  return reportResponse(type, ["Reference", "Member", "Type", "Description", "Amount", "Status", "Balance", "Action role", "Action date"], rows.map((row) => {
    const audit = actionByTransaction.get(row.id);
    return [row.reference, `${row.user.firstName} ${row.user.lastName}`, row.type, row.description, String(row.amount), row.status, String(row.balanceAfter ?? ""), audit?.role || (row.actorId ? actorRoles.get(row.actorId) || "" : ""), audit?.createdAt.toISOString() || row.createdAt.toISOString()];
  }), params);
}

function reportResponse(type: string, headers: string[], rows: string[][], params: URLSearchParams) {
  const csv = [headers, ...rows].map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n");
  if (params.get("format") === "csv") return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename=${type}-report.csv` } });
  return NextResponse.json({ type, headers, rows });
}
