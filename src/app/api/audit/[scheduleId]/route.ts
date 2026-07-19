import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const { env } = await getCloudflareContext({ async: true });
  const scheduleId = Number((await params).scheduleId);
  if (!scheduleId) return jsonError("無效的排班 ID", 400);

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
}
