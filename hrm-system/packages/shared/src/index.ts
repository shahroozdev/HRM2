import { z } from "zod";

export enum Role {
  ADMIN = "ADMIN",
  HR_MANAGER = "HR_MANAGER",
  EMPLOYEE = "EMPLOYEE",
}

export enum EmploymentType {
  FULL_TIME = "FULL_TIME",
  PART_TIME = "PART_TIME",
  CONTRACT = "CONTRACT",
  INTERN = "INTERN",
}

export enum LeaveStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

export enum AttendanceStatus {
  PRESENT = "PRESENT",
  ABSENT = "ABSENT",
  LATE = "LATE",
  HALF_DAY = "HALF_DAY",
  ON_LEAVE = "ON_LEAVE",
}

const isoDateString = z.string().datetime({ offset: true });

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  role: z.nativeEnum(Role),
  isActive: z.boolean().default(true),
  createdAt: isoDateString,
  updatedAt: isoDateString,
});

export const employeeSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  employeeCode: z.string().min(3).max(20),
  department: z.string().min(1).max(100),
  position: z.string().min(1).max(100),
  employmentType: z.nativeEnum(EmploymentType),
  dateOfJoining: isoDateString,
  salary: z.number().nonnegative(),
  managerId: z.string().uuid().nullable(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
});

export const attendanceSchema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  date: isoDateString,
  checkIn: isoDateString.nullable(),
  checkOut: isoDateString.nullable(),
  status: z.nativeEnum(AttendanceStatus),
  notes: z.string().max(500).nullable(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
});

export const leaveSchema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  startDate: isoDateString,
  endDate: isoDateString,
  reason: z.string().min(3).max(1000),
  status: z.nativeEnum(LeaveStatus),
  reviewedBy: z.string().uuid().nullable(),
  reviewedAt: isoDateString.nullable(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
});

export const payrollSchema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  payPeriodStart: isoDateString,
  payPeriodEnd: isoDateString,
  baseSalary: z.number().nonnegative(),
  bonus: z.number().min(0),
  deductions: z.number().min(0),
  netSalary: z.number().nonnegative(),
  paidAt: isoDateString.nullable(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
});

export const documentSchema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  name: z.string().min(1).max(255),
  mimeType: z.string().min(3).max(100),
  filePath: z.string().min(1).max(500),
  sizeInBytes: z.number().int().nonnegative(),
  uploadedBy: z.string().uuid(),
  createdAt: isoDateString,
  updatedAt: isoDateString,
});

export const notificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  isRead: z.boolean().default(false),
  sentAt: isoDateString,
  createdAt: isoDateString,
  updatedAt: isoDateString,
});

export interface User extends z.infer<typeof userSchema> {}
export interface Employee extends z.infer<typeof employeeSchema> {}
export interface Attendance extends z.infer<typeof attendanceSchema> {}
export interface Leave extends z.infer<typeof leaveSchema> {}
export interface Payroll extends z.infer<typeof payrollSchema> {}
export interface Document extends z.infer<typeof documentSchema> {}
export interface Notification extends z.infer<typeof notificationSchema> {}

export type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
  timestamp: string;
};

export type ApiError = {
  success: false;
  message: string;
  errorCode: string;
  details?: Record<string, unknown>;
  timestamp: string;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
