import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/auth";
import { createLoanLocal, loans, users } from "@/lib/store";
import { loanApplicationSchema } from "@/lib/validation";
import { getCategoryConfig } from "@/lib/membership";
import { ensureLoanProducts } from "@/lib/loan-products";
import { randomUUID } from "crypto";

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

    if (new URL(request.url).searchParams.get("products") === "true") {
      return NextResponse.json({ products: await ensureLoanProducts() });
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
      const membership = await prisma.membership.findUnique({ where: { userId: sessionUser.id } });
      if (!membership || membership.status !== "ACTIVE") {
        return NextResponse.json({ error: "Only approved active members may apply for a loan" }, { status: 403 });
      }
      const category = await getCategoryConfig(membership.grade);
      const joinedAt = membership.joinedAt ?? new Date();
      const membershipMonths = Math.floor((Date.now() - joinedAt.getTime()) / (1000 * 60 * 60 * 24 * 30.4375));
      if (membershipMonths < category.minMembershipMonths) {
        return NextResponse.json({ error: `Loan applications become available after ${category.minMembershipMonths} months of membership` }, { status: 403 });
      }
      const savings = await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { userId: sessionUser.id, type: "SAVINGS", status: "POSTED", reversedAt: null },
      });
      const maximum = Number(savings._sum.amount || 0) * category.loanMultiplier;
      if (parsed.data.amount > maximum) {
        return NextResponse.json({ error: `Your ${category.displayName} limit is ₦${maximum.toLocaleString()}` }, { status: 400 });
      }
      const product = parsed.data.loanProductId
        ? await prisma.loanProduct.findUnique({ where: { id: parsed.data.loanProductId } })
        : await prisma.loanProduct.findUnique({ where: { type: parsed.data.type } });
      if (!product || !product.active) return NextResponse.json({ error: "This loan product is not available" }, { status: 400 });
      if (parsed.data.amount < product.minimumAmount || parsed.data.amount > product.maximumAmount) {
        return NextResponse.json({ error: `Amount must be between ₦${product.minimumAmount.toLocaleString()} and ₦${product.maximumAmount.toLocaleString()}` }, { status: 400 });
      }
      const fee = product.processingFeeType === "PERCENTAGE" ? parsed.data.amount * product.processingFeeValue / 100 : product.processingFeeValue;
      const period = parsed.data.repaymentPeriod || product.repaymentPeriod;
      const totalRepayment = parsed.data.amount + fee;
      let guarantor: { id: string; membershipNo: string } | null = null;
      if (parsed.data.guarantorMembershipNo) {
        const candidate = await prisma.membership.findUnique({ where: { membershipNo: parsed.data.guarantorMembershipNo }, select: { userId: true, membershipNo: true, status: true, joinedAt: true } });
        const months = candidate?.joinedAt ? Math.floor((Date.now() - candidate.joinedAt.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)) : 0;
        if (!candidate || candidate.status !== "ACTIVE" || candidate.userId === sessionUser.id || months < 6) {
          return NextResponse.json({ error: "The guarantor must be an active cooperative member for at least 6 months" }, { status: 400 });
        }
        guarantor = { id: candidate.userId, membershipNo: candidate.membershipNo };
      }
      const created = await prisma.$transaction(async (tx) => {
        const application = await tx.loanApplication.create({
        data: {
          applicationNo: `LOAN/${new Date().getFullYear()}/${randomUUID().replaceAll("-", "").slice(0, 5).toUpperCase()}`,
          userId: sessionUser.id,
          type: parsed.data.type,
          loanProductId: product.id,
          amount: parsed.data.amount,
          purpose: parsed.data.purpose,
          repaymentPeriod: period,
          repaymentFrequency: parsed.data.repaymentFrequency || product.repaymentFrequency,
          processingFee: fee,
          totalRepayment,
          estimatedInstallment: totalRepayment / period,
          guarantorName: parsed.data.guarantorName,
          guarantorPhone: parsed.data.guarantorPhone,
          guarantorAddress: parsed.data.guarantorAddress,
          guarantorRelationship: parsed.data.guarantorRelationship,
          guarantorMembershipNo: guarantor?.membershipNo,
          propertyType: parsed.data.propertyType,
          propertyLocation: parsed.data.propertyLocation,
          propertyValue: parsed.data.propertyValue,
          propertyDocuments: parsed.data.propertyDocuments,
          supportingDocuments: parsed.data.supportingDocuments,
          documents: parsed.data.documents,
          commodityItems: parsed.data.commodityItems,
        },
        });
        await tx.notification.create({ data: { userId: sessionUser.id, title: "Loan application received", body: `Your ${product.name} application has been submitted for review.` } });
        if (guarantor) {
          await tx.guarantorRequest.create({ data: { loanApplicationId: application.id, requesterId: sessionUser.id, guarantorId: guarantor.id, guarantorMembershipNo: guarantor.membershipNo } });
          await tx.notification.create({ data: { userId: guarantor.id, title: "Guarantor request pending", body: `${sessionUser.firstName} ${sessionUser.lastName} requested you as a guarantor.` } });
        }
        return application;
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
    const allowedStatuses = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "PENDING", "APPROVED", "DISBURSED", "ACTIVE", "COMPLETED", "REJECTED", "DEFAULTED"];
    if (!allowedStatuses.includes(normalizedStatus)) {
      return NextResponse.json({ error: "Invalid loan status" }, { status: 400 });
    }

    if (process.env.DATABASE_URL) {
      const updated = await prisma.$transaction(async (tx) => {
        const loan = await tx.loanApplication.update({
          where: { id },
          data: {
            status: normalizedStatus as any,
            reviewedBy: sessionUser.id,
            reviewedAt: new Date(),
          },
        });
        const title = normalizedStatus === "APPROVED" ? "Loan approval" : normalizedStatus === "REJECTED" ? "Loan application rejected" : `Loan status: ${normalizedStatus}`;
        await tx.notification.create({ data: { userId: loan.userId, title, body: `Your loan application ${loan.applicationNo} is now ${normalizedStatus.toLowerCase().replace("_", " ")}.` } });
        return loan;
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
