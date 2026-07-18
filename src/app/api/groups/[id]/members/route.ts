import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAuthAdmin } from "@/lib/server/auth/admin";
import { memberSchema, validateInput } from "@/lib/server/middleware/validate";

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

async function requireAdmin(request: NextRequest): Promise<boolean> {
  return (await getAuthAdmin(request)) !== null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!await requireAdmin(request)) {
      return NextResponse.json({ success: false, error: "未授權" }, { status: 401 });
    }

    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;
    const { id } = await params;
    const body = await request.json();
    const validation = validateInput(memberSchema, body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }
    await db.prepare(
      "INSERT INTO Members (group_id, name) VALUES (?, ?)"
    ).bind(Number(id), validation.data.name.trim()).run();
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
    if (!await requireAdmin(request)) {
      return NextResponse.json({ success: false, error: "未授權" }, { status: 401 });
    }

    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;
    const { id: groupId } = await params;
    const body = await request.json();
    const { memberId, name } = body;

    if (!memberId) {
      return NextResponse.json({ success: false, error: "缺少 memberId" }, { status: 400 });
    }
    const validation = validateInput(memberSchema.pick({ name: true }), { name });
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    await db.prepare(
      "UPDATE Members SET name = ? WHERE id = ? AND group_id = ?"
    ).bind(validation.data.name.trim(), Number(memberId), Number(groupId)).run();

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
    if (!await requireAdmin(request)) {
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
    if (!await requireAdmin(request)) {
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
