"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: async () => (await api.get("/documents")).data,
  });
}