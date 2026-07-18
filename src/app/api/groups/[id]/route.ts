import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAuthAdmin } from "@/lib/server/auth/admin";
import { groupSchema, validateInput } from "@/lib/server/middleware/validate";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;
    const { id } = await params;
    const group = await db.prepare("SELECT * FROM Groups WHERE id = ?").bind(Number(id)).first();
    if (!group) {
      return NextResponse.json({ success: false, error: "Group not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: group });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAuthAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "未授權" }, { status: 401 });
    }

    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;
    const { id } = await params;
    const body = await request.json();
    const validation = validateInput(groupSchema, body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }
    await db.prepare("UPDATE Groups SET name = ? WHERE id = ?").bind(validation.data.name.trim(), Number(id)).run();
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
    const admin = await getAuthAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "未授權" }, { status: 401 });
    }

    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;
    const { id } = await params;
    await db.prepare("DELETE FROM Groups WHERE id = ?").bind(Number(id)).run();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
