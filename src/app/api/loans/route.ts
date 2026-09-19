import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { createLoanLocal, loans } from "@/lib/store";
import { loanApplicationSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const sessionUser = await getUserFromRequest(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Authentication is required" }, { status: 401 });
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
