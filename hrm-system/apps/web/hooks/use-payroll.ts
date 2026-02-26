"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function usePayroll(month: number, year: number) {
  return useQuery({
    queryKey: ["payroll", month, year],
    queryFn: async () => (await api.get("/payroll", { params: { month, year } })).data,
  });
}