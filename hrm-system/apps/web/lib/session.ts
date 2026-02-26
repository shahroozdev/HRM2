import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export type SessionUser = {
  id: string;
  email: string;
  role: string;
};

export type AppSession = {
  accessToken: string;
  user: SessionUser;
};

export const SESSION_COOKIE = "hrm_session";

function parseSession(raw: string | undefined): AppSession | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppSession;
  } catch {
    return null;
  }
}

export async function getServerSession(): Promise<AppSession | null> {
  const store = await cookies();
  return parseSession(store.get(SESSION_COOKIE)?.value);
}

export function getRequestSession(req: NextRequest): AppSession | null {
  return parseSession(req.cookies.get(SESSION_COOKIE)?.value);
}

