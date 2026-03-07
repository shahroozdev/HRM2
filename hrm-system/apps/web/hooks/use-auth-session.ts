"use client";

import { useQuery } from "@tanstack/react-query";

type SessionPayload = {
  user?: {
    id?: string;
    email?: string;
    role?: string;
  };
  accessToken?: string;
};

export function useAuthSession() {
  return useQuery({
    queryKey: ["auth-session"],
    queryFn: async (): Promise<SessionPayload | null> => {
      const res = await fetch("/api/auth/session", { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      if (data?.user || data?.accessToken) return data as SessionPayload;
      return data?.data ?? null;
    },
    staleTime: 30_000,
  });
}
