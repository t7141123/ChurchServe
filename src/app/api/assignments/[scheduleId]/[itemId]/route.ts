import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import { sanitize } from "@/lib/server/middleware/sanitize";

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
         request.headers.get("x-real-ip") || 
         "unknown";
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string; itemId: string }> }
) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;

    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`assignment:${ip}`, 10, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "操作太頻繁，請稍後再試" },
        { status: 429 }
      );
    }

    const { scheduleId, itemId } = await params;
    const body = await request.json();
    const { member_id, custom_member_name } = body;

    const schedule = await db.prepare(
      "SELECT * FROM DutySchedules WHERE id = ?"
    ).bind(Number(scheduleId)).first<{ is_locked: number }>();

    if (schedule?.is_locked) {
      return NextResponse.json(
        { success: false, error: "此日期已鎖定，無法修改" },
        { status: 403 }
      );
    }

    const existing = await db.prepare(
      "SELECT * FROM DutyAssignments WHERE schedule_id = ? AND service_item_id = ?"
    ).bind(Number(scheduleId), Number(itemId)).first<{ id: number; version: number }>();

    const sanitizedName = custom_member_name ? sanitize(custom_member_name) : null;

    if (existing) {
      const result = await db.prepare(
        `UPDATE DutyAssignments 
         SET member_id = ?, custom_member_name = ?, version = version + 1
         WHERE schedule_id = ? AND service_item_id = ? AND version = ?`
      ).bind(
        member_id || null,
        sanitizedName,
        Number(scheduleId),
        Number(itemId),
        existing.version
      ).run();

      return NextResponse.json({ success: true });
    } else {
      await db.prepare(
        "INSERT INTO DutyAssignments (schedule_id, service_item_id, member_id, custom_member_name) VALUES (?, ?, ?, ?)"
      ).bind(Number(scheduleId), Number(itemId), member_id || null, sanitizedName).run();
      return NextResponse.json({ success: true }, { status: 201 });
    }
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
