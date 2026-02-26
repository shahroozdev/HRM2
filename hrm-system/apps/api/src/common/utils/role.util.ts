import { UserRole } from "../types/enums";

const rolePriority: Record<UserRole, number> = {
  [UserRole.EMPLOYEE]: 1,
  [UserRole.MANAGER]: 2,
  [UserRole.HR_MANAGER]: 3,
  [UserRole.SUPER_ADMIN]: 4,
};

export function hasMinRole(role: UserRole, minRole: UserRole): boolean {
  return rolePriority[role] >= rolePriority[minRole];
}

export function isAdminRole(role: UserRole): boolean {
  return role === UserRole.SUPER_ADMIN || role === UserRole.HR_MANAGER;
}
