"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AccessPolicy, getDefaultAccessPolicy } from "@/lib/permissions";

export function useAccessPolicy() {
  return useQuery({
    queryKey: ["access-policy"],
    queryFn: async (): Promise<AccessPolicy> => {
      const response = await api.get("/settings/access-policy");
      return response.data?.data ?? getDefaultAccessPolicy();
    },
    retry: false,
    staleTime: 60_000,
  });
}

