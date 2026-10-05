export type Role = "MEMBER" | "EXECUTIVE" | "PRESIDENT" | "SUPER_ADMIN" | "FINANCE_OFFICER" | "LOAN_OFFICER" | "MEMBERSHIP_OFFICER" | "AUDITOR";
export type Permission = "members" | "finance" | "loans" | "reports" | "settings" | "developmentLevy" | "staff";

// Read/visibility permissions - controls what a role can see.
const rolePermissions: Record<Role, Permission[]> = {
  MEMBER: [],
  EXECUTIVE: ["members", "finance", "loans", "reports", "settings"],
  PRESIDENT: ["members", "finance", "loans", "reports", "settings", "developmentLevy"],
  SUPER_ADMIN: ["members", "finance", "loans", "reports", "settings", "developmentLevy", "staff"],
  FINANCE_OFFICER: ["finance", "reports", "developmentLevy"],
  LOAN_OFFICER: ["loans", "reports"],
  MEMBERSHIP_OFFICER: ["members", "reports"],
  AUDITOR: ["finance", "loans", "reports"],
};

// Write/mutation permissions - controls what a role can change. Auditor is read-only.
const writePermissions: Record<Role, Permission[]> = {
  MEMBER: [],
  EXECUTIVE: ["members", "finance", "loans"],
  PRESIDENT: ["members", "finance", "loans"],
  SUPER_ADMIN: ["members", "finance", "loans", "settings", "staff"],
  FINANCE_OFFICER: ["finance"],
  LOAN_OFFICER: ["loans"],
  MEMBERSHIP_OFFICER: ["members"],
  AUDITOR: [],
};

export function can(role: string, permission: Permission) {
  return rolePermissions[role as Role]?.includes(permission) ?? false;
}

export function canWrite(role: string, permission: Permission) {
  return writePermissions[role as Role]?.includes(permission) ?? false;
}

export function isStaff(role: string) {
  return role !== "MEMBER" && Boolean(rolePermissions[role as Role]);
}
