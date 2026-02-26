export type AppRole = "super_admin" | "hr_manager" | "manager" | "employee";

type Resource = "employees" | "attendance" | "leaves" | "payroll" | "documents" | "reports" | "settings";

const viewMatrix: Record<AppRole, Resource[]> = {
  super_admin: ["employees", "attendance", "leaves", "payroll", "documents", "reports", "settings"],
  hr_manager: ["employees", "attendance", "leaves", "payroll", "documents", "reports", "settings"],
  manager: ["employees", "attendance", "leaves", "payroll", "documents", "reports"],
  employee: ["employees", "attendance", "leaves", "payroll", "documents"],
};

const editMatrix: Record<AppRole, Resource[]> = {
  super_admin: ["employees", "attendance", "leaves", "payroll", "documents", "reports", "settings"],
  hr_manager: ["employees", "attendance", "leaves", "payroll", "documents", "reports", "settings"],
  manager: ["employees", "attendance", "leaves", "documents"],
  employee: ["attendance", "leaves", "documents"],
};

export function canView(role: string | undefined, resource: Resource): boolean {
  if (!role) return false;
  return viewMatrix[role as AppRole]?.includes(resource) ?? false;
}

export function canEdit(role: string | undefined, resource: Resource): boolean {
  if (!role) return false;
  return editMatrix[role as AppRole]?.includes(resource) ?? false;
}