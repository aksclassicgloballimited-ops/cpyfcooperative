import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { createLoanLocal, loans, users } from "@/lib/store";
import { loanApplicationSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const sessionUser = await getUserFromRequest(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeAll = searchParams.get("scope") === "all";

  if (includeAll) {
    if (sessionUser.role !== "ADMIN" && sessionUser.role !== "EXECUTIVE") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (process.env.DATABASE_URL) {
      const loanApplications = await prisma.loanApplication.findMany({
        include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ loans: loanApplications }, { status: 200 });
    }

    const allLoans = loans.map((loan) => {
      const applicant = users.get(loan.userId) ?? Array.from(users.values()).find((user) => user.id === loan.userId); 
      return {
        ...loan,
        user: applicant
          ? {
              firstName: applicant.firstName,
              lastName: applicant.lastName,
              email: applicant.email,
              role: applicant.role,
            }
          : null,
      };
    });

    return NextResponse.json({ loans: allLoans }, { status: 200 });
  }

  if (process.env.DATABASE_URL) {
    const loanApplications = await prisma.loanApplication.findMany({
      where: { userId: sessionUser.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ loans: loanApplications }, { status: 200 });
  }

  const userLoans = loans.filter((loan) => loan.userId === sessionUser.id);
  return NextResponse.json({ loans: userLoans }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getUserFromRequest(request);
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Authentication is required before submitting a loan application" },
        { status: 401 },
      );
    }

    const parsed = loanApplicationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid loan application", issues: parsed.error.issues }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      const created = await prisma.loanApplication.create({
        data: {
          userId: sessionUser.id,
          type: parsed.data.type,
          amount: parsed.data.amount,
          purpose: parsed.data.purpose,
        },
      });

      return NextResponse.json({ message: "Loan application submitted", loan: created }, { status: 201 });
    }

    const loan = createLoanLocal(sessionUser.id, parsed.data);
    return NextResponse.json({ message: "Loan application submitted", loan }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Loan submission failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const sessionUser = await getUserFromRequest(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
    }

    if (sessionUser.role !== "ADMIN" && sessionUser.role !== "EXECUTIVE") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { id, status } = body ?? {};
    if (!id || !status) {
      return NextResponse.json({ error: "Loan id and status are required" }, { status: 400 });
    }

    const normalizedStatus = String(status).toUpperCase();
    const allowedStatuses = ["PENDING", "APPROVED", "DISBURSED", "COMPLETED", "REJECTED"];
    if (!allowedStatuses.includes(normalizedStatus)) {
      return NextResponse.json({ error: "Invalid loan status" }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      const updated = await prisma.loanApplication.update({
        where: { id },
        data: {
          status: normalizedStatus as any,
          reviewedBy: sessionUser.id,
          reviewedAt: new Date(),
        },
      });
      return NextResponse.json({ message: "Loan status updated", loan: updated }, { status: 200 });
    }

    const loanIndex = loans.findIndex((loan) => loan.id === id);
    if (loanIndex === -1) {
      return NextResponse.json({ error: "Loan application not found" }, { status: 404 });
    }

    loans[loanIndex] = { ...loans[loanIndex], status: normalizedStatus as any };
    return NextResponse.json({ message: "Loan status updated", loan: loans[loanIndex] }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Loan review failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
