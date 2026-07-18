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
      "SELECT * FROM Members WHERE group_id = ? ORDER BY is_active DESC, name"
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
      return NextResponse.json({ success: false, error: "姓名不可為空" }, { status: 400 });
    }
    await db.prepare(
      "INSERT INTO Members (group_id, name) VALUES (?, ?)"
    ).bind(Number(id), body.name.trim()).run();
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
    const { memberId, name } = body;

    if (!memberId || !name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ success: false, error: "參數錯誤" }, { status: 400 });
    }

    await db.prepare(
      "UPDATE Members SET name = ? WHERE id = ? AND group_id = ?"
    ).bind(name.trim(), Number(memberId), Number(groupId)).run();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(
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
    const { memberId, is_active } = body;

    if (!memberId || is_active === undefined) {
      return NextResponse.json({ success: false, error: "參數錯誤" }, { status: 400 });
    }

    await db.prepare(
      "UPDATE Members SET is_active = ? WHERE id = ? AND group_id = ?"
    ).bind(is_active ? 1 : 0, Number(memberId), Number(groupId)).run();

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
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json({ success: false, error: "缺少 memberId" }, { status: 400 });
    }

    await db.prepare(
      "DELETE FROM Members WHERE id = ? AND group_id = ?"
    ).bind(Number(memberId), Number(groupId)).run();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
