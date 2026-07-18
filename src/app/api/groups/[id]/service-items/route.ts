import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAuthAdmin } from "@/lib/server/auth/admin";

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

function requireAdmin(request: NextRequest): boolean {
  return getAuthAdmin(request) !== null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!requireAdmin(request)) {
      return NextResponse.json({ success: false, error: "未授權" }, { status: 401 });
    }

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!requireAdmin(request)) {
      return NextResponse.json({ success: false, error: "未授權" }, { status: 401 });
    }

    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;
    const { id: groupId } = await params;
    const body = await request.json();
    const { itemId, name, display_order } = body;

    if (!itemId) {
      return NextResponse.json({ success: false, error: "缺少 itemId" }, { status: 400 });
    }

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json({ success: false, error: "項目名稱不可為空" }, { status: 400 });
      }
      await db.prepare(
        "UPDATE ServiceItems SET name = ? WHERE id = ? AND group_id = ?"
      ).bind(name.trim(), Number(itemId), Number(groupId)).run();
    }

    if (display_order !== undefined) {
      await db.prepare(
        "UPDATE ServiceItems SET display_order = ? WHERE id = ? AND group_id = ?"
      ).bind(Number(display_order), Number(itemId), Number(groupId)).run();
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!requireAdmin(request)) {
      return NextResponse.json({ success: false, error: "未授權" }, { status: 401 });
    }

    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;
    const { id: groupId } = await params;
    const body = await request.json();
    const { itemId } = body;

    if (!itemId) {
      return NextResponse.json({ success: false, error: "缺少 itemId" }, { status: 400 });
    }

    await db.prepare(
      "DELETE FROM ServiceItems WHERE id = ? AND group_id = ?"
    ).bind(Number(itemId), Number(groupId)).run();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
