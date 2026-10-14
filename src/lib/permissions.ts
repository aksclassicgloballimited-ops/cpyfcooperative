export type Role = "MEMBER" | "EXECUTIVE" | "PRESIDENT" | "SUPER_ADMIN" | "FINANCE_OFFICER" | "LOAN_OFFICER" | "MEMBERSHIP_OFFICER" | "AUDITOR";
export type Permission = "members" | "finance" | "loans" | "reports" | "settings" | "developmentLevy" | "staff";

// Read/visibility permissions - controls what a role can see.
const rolePermissions: Record<Role, Permission[]> = {
  MEMBER: [],
  EXECUTIVE: ["members", "finance", "loans", "reports", "settings"],
  PRESIDENT: ["reports"],
  SUPER_ADMIN: ["members", "finance", "loans", "reports", "settings", "developmentLevy", "staff"],
  FINANCE_OFFICER: ["finance", "reports"],
  LOAN_OFFICER: ["loans", "reports"],
  MEMBERSHIP_OFFICER: ["members", "reports"],
  AUDITOR: ["reports"],
};

// Write/mutation permissions - controls what a role can change. Auditor is read-only.
const writePermissions: Record<Role, Permission[]> = {
  MEMBER: [],
  EXECUTIVE: ["members", "finance", "loans"],
  PRESIDENT: [],
  SUPER_ADMIN: ["members", "finance", "loans", "settings", "staff"],
  FINANCE_OFFICER: ["finance"],
  LOAN_OFFICER: ["loans"],
  MEMBERSHIP_OFFICER: ["members"],
  AUDITOR: [],
};

export type ReportType = "transactions" | "loans" | "members" | "development" | "shares";

const reportPermissions: Record<Role, ReportType[]> = {
  MEMBER: [],
  EXECUTIVE: ["members", "transactions", "loans"],
  PRESIDENT: ["members", "transactions", "loans"],
  SUPER_ADMIN: ["members", "transactions", "loans", "development", "shares"],
  FINANCE_OFFICER: ["members", "transactions", "loans"],
  LOAN_OFFICER: ["loans"],
  MEMBERSHIP_OFFICER: ["members"],
  AUDITOR: ["transactions", "loans", "development", "shares", "members"],
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

export function canViewReport(role: string, report: string) {
  return reportPermissions[role as Role]?.includes(report as ReportType) ?? false;
}

export function reportTypesForRole(role: string) {
  return reportPermissions[role as Role] ?? [];
}

export function canViewDashboard(role: string) {
  return ["PRESIDENT", "FINANCE_OFFICER", "LOAN_OFFICER", "MEMBERSHIP_OFFICER", "SUPER_ADMIN", "EXECUTIVE"].includes(role);
}
