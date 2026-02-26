"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useEmployees(page: number, q = "") {
  return useQuery({
    queryKey: ["employees", page, q],
    queryFn: async () => {
      const response = await api.get("/employees", { params: { page, q } });
      return response.data;
    },
  });
}