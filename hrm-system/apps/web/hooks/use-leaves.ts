"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useLeaves() {
  return useQuery({
    queryKey: ["leaves"],
    queryFn: async () => (await api.get("/leaves")).data,
  });
}