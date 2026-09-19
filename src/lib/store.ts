import { randomUUID } from "crypto";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export type StoredUser = {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: "MEMBER" | "EXECUTIVE" | "ADMIN";
  createdAt: string;
  membership?: {
    category: "APPEARANCE" | "NON_APPEARANCE";
    grade: "ACTIVE" | "SILVER" | "GOLDEN";
    status: "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
    membershipNo: string;
    weeklyTarget: number;
  };
};

export type StoredLoan = {
  id: string;
  userId: string;
  type: "PROPERTY" | "BUSINESS" | "EMERGENCY";
  amount: number;
  purpose: string;
  status: "PENDING" | "APPROVED" | "DISBURSED" | "COMPLETED" | "REJECTED";
  createdAt: string;
};

const globalStore = globalThis as typeof globalThis & {
  __cpyif_users?: Map<string, StoredUser>;
  __cpyif_loans?: StoredLoan[];
  __cpyif_sessions?: Map<string, { userId: string; expiresAt: number }>;
};

export const users = globalStore.__cpyif_users ?? new Map<string, StoredUser>();
export const loans = globalStore.__cpyif_loans ?? [];
export const sessions = globalStore.__cpyif_sessions ?? new Map<string, { userId: string; expiresAt: number }>();

globalStore.__cpyif_users = users;
globalStore.__cpyif_loans = loans;
globalStore.__cpyif_sessions = sessions;

const seedDemoAccounts = async () => {
  const demoAccounts: Array<{
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    role: StoredUser["role"];
    category: "APPEARANCE" | "NON_APPEARANCE";
    weeklyTarget: number;
  }> = [
    {
      email: "admin@cpyif.org",
      password: "Admin@123",
      firstName: "System",
      lastName: "Admin",
      phone: "+2348000000000",
      role: "ADMIN",
      category: "NON_APPEARANCE",
      weeklyTarget: 5000,
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
    },
    {
      email: "member@cpyif.org",
      password: "Member@123",
      firstName: "Ada",
      lastName: "Musa",
      phone: "+2348000000002",
      role: "MEMBER",
      category: "APPEARANCE",
      weeklyTarget: 2500,
    },
  ];

  for (const account of demoAccounts) {
    if (users.has(account.email.toLowerCase())) continue;

    const passwordHash = await hash(account.password, 12);
    users.set(account.email.toLowerCase(), {
      id: randomUUID(),
      email: account.email.toLowerCase(),
      passwordHash,
      firstName: account.firstName,
      lastName: account.lastName,
      phone: account.phone,
      role: account.role,
      createdAt: new Date().toISOString(),
      membership: {
        category: account.category,
        grade: account.role === "MEMBER" ? "ACTIVE" : "GOLDEN",
        status: "ACTIVE",
        membershipNo: account.role === "ADMIN" ? "CPYF-ADMIN" : account.role === "EXECUTIVE" ? "CPYF-EXEC" : "CPYF-1789822284234",
        weeklyTarget: account.weeklyTarget,
      },
    });
  }
};

void seedDemoAccounts();

export const createUserLocal = async (payload: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  category: "APPEARANCE" | "NON_APPEARANCE";
  weeklyTarget: number;
}) => {
  const passwordHash = await hash(payload.password, 12);
  const user: StoredUser = {
    id: randomUUID(),
    email: payload.email.toLowerCase(),
    passwordHash,
    firstName: payload.firstName,
    lastName: payload.lastName,
    phone: payload.phone,
    role: "MEMBER",
    createdAt: new Date().toISOString(),
    membership: {
      category: payload.category,
      grade: "ACTIVE",
      status: "PENDING",
      membershipNo: `CPYF-${Date.now()}`,
      weeklyTarget: Number(payload.weeklyTarget),
    },
  };

  users.set(user.email, user);
  return user;
};

export const findUserByEmailLocal = async (email: string) => {
  const result = users.get(email.toLowerCase());
  return result ?? null;
};

export const verifyUserCredentialsLocal = async (email: string, password: string) => {
  const user = await findUserByEmailLocal(email);
  if (!user) return null;

  const isValid = await compare(password, user.passwordHash);
  if (!isValid) return null;

  return user;
};

export const createSessionLocal = async (userId: string) => {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  if (process.env.DATABASE_URL) {
    await prisma.session.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
    return token;
  }

  sessions.set(token, {
    userId,
    expiresAt: expiresAt.getTime(),
  });
  return token;
};

export const getSessionUserLocal = async (token: string | null | undefined) => {
  if (!token) return null;

  if (process.env.DATABASE_URL) {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: { include: { membership: true } } },
    });

    if (!session) return null;
    if (session.expiresAt < new Date()) {
      await prisma.session.delete({ where: { token } });
      return null;
    }

    return session.user;
  }

  const session = sessions.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }

  const user = Array.from(users.values()).find((item) => item.id === session.userId);
  return user ?? null;
};

export const createLoanLocal = (userId: string, payload: { type: "PROPERTY" | "BUSINESS" | "EMERGENCY"; amount: number; purpose: string }) => {
  const loan: StoredLoan = {
    id: randomUUID(),
    userId,
    type: payload.type,
    amount: Number(payload.amount),
    purpose: payload.purpose,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  loans.push(loan);
  return loan;
};

export const sanitizeUser = (user: StoredUser | null | undefined) => {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
};
