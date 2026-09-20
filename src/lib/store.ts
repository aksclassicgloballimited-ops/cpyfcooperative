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
