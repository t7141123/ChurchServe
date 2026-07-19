import { NextResponse } from "next/server";

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function jsonError(error: string, status = 400): NextResponse {
  return NextResponse.json({ error }, { status });
}
