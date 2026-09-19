import { hash } from "bcryptjs";

import { prisma } from "@/lib/prisma";

export async function seedDemoUsers() {
  const demoUsers = [
    {
      email: "member@cpyif.org",
      password: "Member@123",
      firstName: "Ada",
      lastName: "Musa",
      phone: "+2348000000002",
      role: "MEMBER",
      category: "APPEARANCE",
      weeklyTarget: 2500,
      membershipNo: "CPYF-1789822284234",
      grade: "ACTIVE",
    },
    {
      email: "admin@cpyif.org",
      password: "Admin@123",
      firstName: "System",
      lastName: "Admin",
      phone: "+2348000000000",
      role: "ADMIN",
      category: "NON_APPEARANCE",
      weeklyTarget: 5000,
      membershipNo: "CPYF-ADMIN",
      grade: "GOLDEN",
    },
    {
      email: "executive@cpyif.org",
      password: "Exec@123",
      firstName: "Executive",
      lastName: "Board",
      phone: "+2348000000001",
      role: "EXECUTIVE",
      category: "NON_APPEARANCE",
      weeklyTarget: 5000,
      membershipNo: "CPYF-EXEC",
      grade: "GOLDEN",
    },
  ] as const;

  for (const user of demoUsers) {
    const passwordHash = await hash(user.password, 12);
    const storedUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
      },
      create: {
        email: user.email,
        passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
      },
    });

    await prisma.membership.upsert({
      where: { userId: storedUser.id },
      update: {
        category: user.category,
        grade: user.grade,
        status: "ACTIVE",
        membershipNo: user.membershipNo,
        weeklyTarget: user.weeklyTarget,
        joinedAt: new Date(),
      },
      create: {
        userId: storedUser.id,
        category: user.category,
        grade: user.grade,
        status: "ACTIVE",
        membershipNo: user.membershipNo,
        weeklyTarget: user.weeklyTarget,
        joinedAt: new Date(),
      },
    });
  }
}
