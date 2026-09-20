import { Role } from "@prisma/client";

export type Permission = "members" | "finance" | "loans" | "reports" | "settings";

const rolePermissions: Record<Role, Permission[]> = {
  MEMBER: [],
  EXECUTIVE: ["members", "finance", "loans", "reports", "settings"],
  ADMIN: ["members", "finance", "loans", "reports", "settings"],
  SUPER_ADMIN: ["members", "finance", "loans", "reports", "settings"],
  FINANCE_OFFICER: ["finance", "reports"],
  LOAN_OFFICER: ["loans", "reports"],
  MEMBERSHIP_OFFICER: ["members", "reports"],
  AUDITOR: ["finance", "loans", "reports"],
};

export function can(role: string, permission: Permission) {
  return rolePermissions[role as Role]?.includes(permission) ?? false;
}

export function isStaff(role: string) {
  return role !== "MEMBER" && Boolean(rolePermissions[role as Role]);
}
