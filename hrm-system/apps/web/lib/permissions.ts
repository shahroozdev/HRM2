export type AppRole = "super_admin" | "hr_manager" | "manager" | "employee";

export type Resource = "dashboard" | "employees" | "attendance" | "leaves" | "payroll" | "documents" | "reports" | "settings";

export type AccessPolicy = {
  sidebar: Record<AppRole, Resource[]>;
  actions: {
    attendanceManualMark: AppRole[];
  };
};

const defaultPolicy: AccessPolicy = {
  sidebar: {
    super_admin: ["dashboard", "employees", "attendance", "leaves", "payroll", "documents", "reports", "settings"],
    hr_manager: ["dashboard", "employees", "attendance", "leaves", "payroll", "documents", "reports"],
    manager: ["dashboard", "employees", "attendance", "leaves", "documents", "reports"],
    employee: ["dashboard", "attendance", "leaves", "documents", "payroll"],
  },
  actions: {
    attendanceManualMark: ["super_admin", "hr_manager", "manager"],
  },
};

const editMatrix: Record<AppRole, Resource[]> = {
  super_admin: ["dashboard", "employees", "attendance", "leaves", "payroll", "documents", "reports", "settings"],
  hr_manager: ["dashboard", "employees", "attendance", "leaves", "payroll", "documents", "reports"],
  manager: ["dashboard", "attendance", "leaves", "documents"],
  employee: ["dashboard", "leaves", "documents", "payroll"],
};

export function getDefaultAccessPolicy(): AccessPolicy {
  return defaultPolicy;
}

export function canView(role: string | undefined, resource: Resource, policy?: Partial<AccessPolicy>): boolean {
  if (!role) return false;
  const resolved = (policy as AccessPolicy | undefined) ?? defaultPolicy;
  return resolved.sidebar?.[role as AppRole]?.includes(resource) ?? false;
}

export function canEdit(role: string | undefined, resource: Resource): boolean {
  if (!role) return false;
  return editMatrix[role as AppRole]?.includes(resource) ?? false;
}

export function canManualAttendance(role: string | undefined, policy?: Partial<AccessPolicy>): boolean {
  if (!role) return false;
  const resolved = (policy as AccessPolicy | undefined) ?? defaultPolicy;
  return resolved.actions?.attendanceManualMark?.includes(role as AppRole) ?? false;
}
