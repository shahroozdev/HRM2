"use server";

import { revalidatePath } from "next/cache";
import { apiRequest } from "@/lib/server-api";

export async function createEmployeeAction(payload: Record<string, unknown>) {
  await apiRequest("/employees", { method: "POST", body: JSON.stringify(payload) });
  revalidatePath("/employees");
}

export async function checkInAction(payload: Record<string, unknown>) {
  await apiRequest("/attendance/check-in", { method: "POST", body: JSON.stringify(payload) });
  revalidatePath("/attendance");
}

export async function applyLeaveAction(payload: Record<string, unknown>) {
  await apiRequest("/leaves/apply", { method: "POST", body: JSON.stringify(payload) });
  revalidatePath("/leaves");
}

export async function processPayrollAction(payload: Record<string, unknown>) {
  await apiRequest("/payroll/process", { method: "POST", body: JSON.stringify(payload) });
  revalidatePath("/payroll");
}