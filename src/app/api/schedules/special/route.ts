import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAuthAdmin } from "@/lib/server/auth/admin";
import { specialEventSchema, validateInput } from "@/lib/server/middleware/validate";

export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "未授權" }, { status: 401 });
    }

    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;
    const body = await request.json();
    const validation = validateInput(specialEventSchema, body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }
    const { group_id, date, event_title } = validation.data;

    const existing = await db.prepare(
      "SELECT id FROM DutySchedules WHERE group_id = ? AND date = ?"
    ).bind(group_id, date).first();

    if (existing) {
      await db.prepare(
        "UPDATE DutySchedules SET is_special_event = 1, event_title = ?, is_locked = 1, lock_message = ? WHERE group_id = ? AND date = ?"
      ).bind(event_title, event_title, group_id, date).run();
    } else {
      await db.prepare(
        "INSERT INTO DutySchedules (group_id, date, is_special_event, event_title, is_locked, lock_message) VALUES (?, ?, 1, ?, 1, ?)"
      ).bind(group_id, date, event_title, event_title).run();
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await getAuthAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "未授權" }, { status: 401 });
    }

    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "ID required" }, { status: 400 });
    }
    await db.prepare(
      "UPDATE DutySchedules SET is_special_event = 0, event_title = NULL, is_locked = 0, lock_message = NULL WHERE id = ?"
    ).bind(Number(id)).run();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
