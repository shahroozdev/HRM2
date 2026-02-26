export enum UserRole {
  SUPER_ADMIN = "super_admin",
  HR_MANAGER = "hr_manager",
  MANAGER = "manager",
  EMPLOYEE = "employee",
}

export enum EmploymentType {
  FULL_TIME = "full_time",
  PART_TIME = "part_time",
  CONTRACT = "contract",
}

export enum EmployeeStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  TERMINATED = "terminated",
}

export enum AttendanceStatus {
  PRESENT = "present",
  ABSENT = "absent",
  LATE = "late",
  HALF_DAY = "half_day",
}

export enum LeaveRequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum PayrollStatus {
  DRAFT = "draft",
  PROCESSED = "processed",
  PAID = "paid",
}

export enum DocumentType {
  OFFER = "offer",
  APPOINTMENT = "appointment",
  EXPERIENCE = "experience",
  WARNING = "warning",
  OTHER = "other",
}

export enum DocumentAccessLevel {
  EMPLOYEE = "employee",
  MANAGER = "manager",
  HR = "hr",
  ADMIN = "admin",
}
