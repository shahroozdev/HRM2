import { NextRequest, NextResponse } from "next/server";
import { getRequestSession } from "@/lib/session";

function getApiBaseUrl(): string {
  const base = process.env.API_SERVER_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error("API_SERVER_URL or NEXT_PUBLIC_API_URL is required");
  }
  return base.replace(/\/$/, "");
}

async function proxy(req: NextRequest, path: string[]) {
  const target = new URL(`${getApiBaseUrl()}/${path.join("/")}`);
  req.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));

  const headers = new Headers(req.headers);
  headers.delete("cookie");
  headers.delete("host");
  headers.delete("content-length");
  headers.delete("connection");

  const session = getRequestSession(req);
  if (session?.accessToken) {
    headers.set("authorization", `Bearer ${session.accessToken}`);
  }

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const body = hasBody ? await req.arrayBuffer() : undefined;

  const upstream = await fetch(target, {
    method: req.method,
    headers,
    body: hasBody ? body : undefined,
    redirect: "manual",
    cache: "no-store",
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: upstream.headers,
  });
}

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(req, path);
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(req, path);
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(req, path);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(req, path);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return proxy(req, path);
}

