import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { getAuthAdmin, requireGroupAccess } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
    if (!admin) return jsonError("未授權", 401);

    const scheduleId = Number((await params).scheduleId);
    if (!scheduleId) return jsonError("無效的排班 ID", 400);

    const schedule = await (env.DB as D1Database).prepare(
      "SELECT group_id FROM DutySchedules WHERE id = ? LIMIT 1"
    ).bind(scheduleId).first() as { group_id: number } | null;
    if (!schedule) return jsonError("找不到排班記錄", 404);
    if (!await requireGroupAccess(admin, schedule.group_id, env.DB as D1Database)) return jsonError("無權限", 403);

    const rows = await (env.DB as D1Database).prepare(
      `SELECT a.id, a.schedule_id, a.service_item_id, a.member_id, a.custom_member_name,
              a.action, a.old_value, a.new_value, a.admin_id, a.created_at,
              si.name as service_item_name,
              m.name as member_name
       FROM AssignmentAudit a
       LEFT JOIN ServiceItems si ON a.service_item_id = si.id
       LEFT JOIN Members m ON a.member_id = m.id
       WHERE a.schedule_id = ?
       ORDER BY a.created_at DESC
       LIMIT 100`
    ).bind(scheduleId).all();

    return json(rows.results);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "未知錯誤", 500);
  }
}
