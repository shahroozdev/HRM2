"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useReports() {
  const attendance = useQuery({ queryKey: ["r-attendance"], queryFn: async () => (await api.get("/reports/attendance-summary")).data });
  const leaves = useQuery({ queryKey: ["r-leaves"], queryFn: async () => (await api.get("/reports/leave-utilization")).data });
  const salary = useQuery({ queryKey: ["r-salary"], queryFn: async () => (await api.get("/reports/salary-expense")).data });
  const dept = useQuery({ queryKey: ["r-dept"], queryFn: async () => (await api.get("/reports/department-analytics")).data });
  return { attendance, leaves, salary, dept };
}