import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { assignmentSchema, validateInput } from "@/lib/validate";
import { getAuthAdmin } from "@/lib/auth";
import { sanitize } from "@/lib/sanitize";

export async function PUT(
  request: Request
) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  let body: {
    member_id?: number | null;
    custom_member_name?: string | null;
    schedule_id?: number;
    service_item_id?: number;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError("無效的請求格式", 400);
  }

  const parsed = validateInput(assignmentSchema, body);
  if (!parsed.success) return jsonError(parsed.error, 400);

  const scheduleId = Number(body.schedule_id);
  const serviceItemId = Number(body.service_item_id);

  if (!scheduleId || !serviceItemId) {
    return jsonError("缺少排班 ID 或服事項目 ID", 400);
  }

  const memberId = parsed.data.member_id ?? null;
  const customName = parsed.data.custom_member_name ? sanitize(parsed.data.custom_member_name) : null;

  await (env.DB as D1Database).prepare(
    `INSERT INTO DutyAssignments (schedule_id, service_item_id, member_id, custom_member_name)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(schedule_id, service_item_id)
     DO UPDATE SET member_id = excluded.member_id, custom_member_name = excluded.custom_member_name, version = version + 1`
  ).bind(scheduleId, serviceItemId, memberId, customName).run();

  return json({ message: "已更新" });
}
