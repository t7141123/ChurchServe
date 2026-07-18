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
      "SELECT * FROM ServiceItems WHERE group_id = ? ORDER BY display_order"
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
      return NextResponse.json({ success: false, error: "項目名稱不可為空" }, { status: 400 });
    }
    const maxOrder = await db.prepare(
      "SELECT COALESCE(MAX(display_order), 0) as max_order FROM ServiceItems WHERE group_id = ?"
    ).bind(Number(id)).first<{ max_order: number }>();
    
    await db.prepare(
      "INSERT INTO ServiceItems (group_id, name, display_order) VALUES (?, ?, ?)"
    ).bind(Number(id), body.name.trim(), (maxOrder?.max_order ?? 0) + 1).run();
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
