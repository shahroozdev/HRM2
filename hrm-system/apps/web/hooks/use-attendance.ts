"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useAttendance(params: Record<string, string | number>) {
  return useQuery({
    queryKey: ["attendance", params],
    queryFn: async () => (await api.get("/attendance", { params })).data,
  });
}