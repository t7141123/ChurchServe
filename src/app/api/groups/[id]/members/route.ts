import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;
    const { id } = await params;
    const result = await db.prepare(
      "SELECT * FROM Members WHERE group_id = ? ORDER BY is_active DESC, name"
    ).bind(Number(id)).all();
    return NextResponse.json({ success: true, data: result.results });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;
    const { id } = await params;
    const body = await request.json();
    if (!body.name || typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ success: false, error: "姓名不可為空" }, { status: 400 });
    }
    const result = await db.prepare(
      "INSERT INTO Members (group_id, name) VALUES (?, ?)"
    ).bind(Number(id), body.name.trim()).run();
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
