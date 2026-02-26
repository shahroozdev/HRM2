import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

function getApiBaseUrl(): string {
  const base = process.env.API_SERVER_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error("API_SERVER_URL or NEXT_PUBLIC_API_URL is required");
  }
  return base.replace(/\/$/, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch(`${getApiBaseUrl()}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.data?.accessToken || !data?.data?.user) {
      return NextResponse.json(
        { error: { message: data?.error?.message ?? "Invalid credentials" } },
        { status: res.status || 401 },
      );
    }

    const session = {
      accessToken: data.data.accessToken,
      user: data.data.user,
    };

    const response = NextResponse.json({ data: { user: data.data.user }, message: "Login successful" });
    response.cookies.set(SESSION_COOKIE, JSON.stringify(session), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch {
    return NextResponse.json({ error: { message: "Login failed" } }, { status: 500 });
  }
}

