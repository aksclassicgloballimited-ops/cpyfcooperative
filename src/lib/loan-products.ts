import { LoanType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const defaultLoanProducts = [
  {
    name: "General Loan",
    type: LoanType.GENERAL,
    maximumAmount: 5000000,
    minimumAmount: 10000,
    processingFeeType: "PERCENTAGE",
    processingFeeValue: 2,
    repaymentPeriod: 12,
    repaymentFrequency: "MONTHLY",
    eligibilityRequirements: "Active membership, minimum savings and approved guarantor.",
    requiredSavings: 0,
    requiredShares: 0,
    guarantorRequirements: "One verified cooperative member guarantor.",
    documentationRequirements: "Valid identification and proof of income.",
    terms: "Interest-free cooperative financing subject to approval.",
  },
  {
    name: "Property Loan",
    type: LoanType.PROPERTY,
    maximumAmount: 15000000,
    minimumAmount: 100000,
    processingFeeType: "PERCENTAGE",
    processingFeeValue: 2,
    repaymentPeriod: 36,
    repaymentFrequency: "MONTHLY",
    eligibilityRequirements: "Active membership, required savings, verified property documents.",
    requiredSavings: 100000,
    requiredShares: 1,
    guarantorRequirements: "Two verified guarantors.",
    documentationRequirements: "Identification, title/property and supporting documents.",
    terms: "Property financing is subject to valuation and committee approval.",
  },
  {
    name: "Commodity Loan",
    type: LoanType.COMMODITY,
    maximumAmount: 2000000,
    minimumAmount: 5000,
    processingFeeType: "PERCENTAGE",
    processingFeeValue: 1,
    repaymentPeriod: 6,
    repaymentFrequency: "MONTHLY",
    eligibilityRequirements: "Active membership and sufficient savings.",
    requiredSavings: 0,
    requiredShares: 0,
    guarantorRequirements: "One verified guarantor.",
    documentationRequirements: "Valid identification.",
    terms: "Approved items are supplied through the cooperative.",
  },
];

export async function ensureLoanProducts() {
  await Promise.all(defaultLoanProducts.map((product) => prisma.loanProduct.upsert({
    where: { type: product.type },
    update: {},
    create: product,
  })));
  return prisma.loanProduct.findMany({ where: { active: true }, orderBy: { name: "asc" } });
}
