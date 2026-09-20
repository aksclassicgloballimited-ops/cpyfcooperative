import { MembershipGrade } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const defaultCategoryConfigs = [
  {
    grade: MembershipGrade.ACTIVE,
    displayName: "ACTIVE MEMBER",
    durationYears: 2,
    loanMultiplier: 2,
    minMembershipMonths: 6,
    minimumSavings: 0,
  },
  {
    grade: MembershipGrade.SILVER,
    displayName: "SILVER MEMBER",
    durationYears: 5,
    loanMultiplier: 3,
    minMembershipMonths: 0,
    minimumSavings: 0,
  },
  {
    grade: MembershipGrade.GOLDEN,
    displayName: "GOLDEN MEMBER",
    durationYears: 0,
    loanMultiplier: 3,
    minMembershipMonths: 0,
    minimumSavings: 0,
  },
];

export async function ensureCategoryConfigs() {
  await Promise.all(
    defaultCategoryConfigs.map((config) =>
      prisma.membershipCategoryConfig.upsert({
        where: { grade: config.grade },
        update: {},
        create: config,
      }),
    ),
  );
  return prisma.membershipCategoryConfig.findMany({ orderBy: { grade: "asc" } });
}

export async function getCategoryConfig(grade: MembershipGrade) {
  const existing = await prisma.membershipCategoryConfig.findUnique({ where: { grade } });
  if (existing) return existing;
  const fallback = defaultCategoryConfigs.find((item) => item.grade === grade);
  if (!fallback) throw new Error(`No configuration exists for ${grade}`);
  return prisma.membershipCategoryConfig.create({ data: fallback });
}

export function membershipLabel(grade?: string | null) {
  if (grade === "SILVER") return "SILVER MEMBER";
  if (grade === "GOLDEN") return "GOLDEN MEMBER";
  return "ACTIVE MEMBER";
}
