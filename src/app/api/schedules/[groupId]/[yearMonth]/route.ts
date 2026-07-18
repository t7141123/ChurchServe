import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; yearMonth: string }> }
) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;
    const { groupId, yearMonth } = await params;

    const schedules = await db.prepare(
      "SELECT * FROM DutySchedules WHERE group_id = ? AND date LIKE ? ORDER BY date"
    ).bind(Number(groupId), `${yearMonth}%`).all<Record<string, unknown>>();

    const scheduleIds = schedules.results.map((s) => s.id as number);
    const assignments: Record<number, unknown[]> = {};

    if (scheduleIds.length > 0) {
      const placeholders = scheduleIds.map(() => "?").join(",");
      const assignResult = await db.prepare(
        `SELECT da.*, si.name as service_item_name, si.display_order as service_item_order,
                m.name as member_name
         FROM DutyAssignments da
         LEFT JOIN ServiceItems si ON da.service_item_id = si.id
         LEFT JOIN Members m ON da.member_id = m.id
         WHERE da.schedule_id IN (${placeholders})
         ORDER BY si.display_order`
      ).bind(...scheduleIds).all<Record<string, unknown>>();

      for (const a of assignResult.results) {
        const scheduleId = a.schedule_id as number;
        if (!assignments[scheduleId]) {
          assignments[scheduleId] = [];
        }
        assignments[scheduleId].push(a);
      }
    }

    const enriched = schedules.results.map((schedule) => ({
      ...schedule,
      assignments: assignments[schedule.id as number] || [],
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
