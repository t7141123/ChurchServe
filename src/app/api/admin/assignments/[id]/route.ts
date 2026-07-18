import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAuthAdmin } from "@/lib/server/auth/admin";
import { sanitize } from "@/lib/server/middleware/sanitize";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;

    const admin = await getAuthAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "未授權" }, { status: 401 });
    }

    const body = await request.json();
    const { schedule_id, service_item_id, member_id, custom_member_name } = body;

    if (!schedule_id || !service_item_id) {
      return NextResponse.json({ success: false, error: "缺少必要欄位" }, { status: 400 });
    }

    const sanitizedName = custom_member_name ? sanitize(custom_member_name) : null;

    const existing = await db.prepare(
      "SELECT id, version FROM DutyAssignments WHERE schedule_id = ? AND service_item_id = ?"
    ).bind(Number(schedule_id), Number(service_item_id)).first<{ id: number; version: number }>();

    if (existing) {
      await db.prepare(
        "UPDATE DutyAssignments SET member_id = ?, custom_member_name = ?, version = version + 1 WHERE id = ? AND version = ?"
      ).bind(member_id || null, sanitizedName, existing.id, existing.version).run();
    } else {
      await db.prepare(
        "INSERT INTO DutyAssignments (schedule_id, service_item_id, member_id, custom_member_name) VALUES (?, ?, ?, ?)"
      ).bind(Number(schedule_id), Number(service_item_id), member_id || null, sanitizedName).run();
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
