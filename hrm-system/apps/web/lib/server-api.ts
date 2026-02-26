"use server";

import { getServerSession } from "@/lib/session";

export async function apiRequest(path: string, init: RequestInit = {}): Promise<any> {
  const session = await getServerSession();
  const apiBase = (process.env.API_SERVER_URL ?? process.env.NEXT_PUBLIC_API_URL)?.replace(/\/$/, "");
  if (!apiBase) {
    throw new Error("API_SERVER_URL or NEXT_PUBLIC_API_URL is required");
  }
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message ?? "Request failed");
  }
  return data;
}
