import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { assignmentSchema, validateInput } from "@/lib/validate";
import { sanitize } from "@/lib/sanitize";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string; serviceItemId: string }> }
) {
  const { env } = await getCloudflareContext({ async: true });
  const { scheduleId: scheduleIdStr, serviceItemId: serviceItemIdStr } = await params;
  const scheduleId = Number(scheduleIdStr);
  const serviceItemId = Number(serviceItemIdStr);
  const db = env.DB as D1Database;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("無效的請求格式", 400);
  }

  // Validate the request body
  const parsed = validateInput(assignmentSchema, body);
  if (!parsed.success) {
    return jsonError(parsed.error, 400);
  }

  // Check if the schedule is locked
  const schedule = await db.prepare(
    "SELECT is_locked, lock_message FROM DutySchedules WHERE id = ? LIMIT 1"
  ).bind(scheduleId).first() as { is_locked: number; lock_message: string | null } | null;

  if (!schedule) {
    return jsonError("找不到排班記錄", 404);
  }

  if (schedule.is_locked === 1) {
    return jsonError(schedule.lock_message || "此日期已鎖定，無法修改登記", 403);
  }

  const memberId = parsed.data.member_id ?? null;
  const customName = parsed.data.custom_member_name ? sanitize(parsed.data.custom_member_name) : null;

  // Get current assignment for audit
  const current = await db.prepare(
    "SELECT member_id, custom_member_name FROM DutyAssignments WHERE schedule_id = ? AND service_item_id = ? LIMIT 1"
  ).bind(scheduleId, serviceItemId).first<{ member_id: number | null; custom_member_name: string | null }>();

  // Insert or update assignment
  await db.prepare(
    `INSERT INTO DutyAssignments (schedule_id, service_item_id, member_id, custom_member_name)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(schedule_id, service_item_id)
     DO UPDATE SET member_id = excluded.member_id, custom_member_name = excluded.custom_member_name, version = version + 1`
  ).bind(scheduleId, serviceItemId, memberId, customName).run();

  // Audit
  const oldVal = current ? JSON.stringify({ member_id: current.member_id, custom_member_name: current.custom_member_name }) : null;
  const newVal = JSON.stringify({ member_id: memberId, custom_member_name: customName });
  let action = "assign";
  if (current && current.member_id !== null && memberId === null) action = "unassign";
  else if (current && JSON.stringify(current) !== JSON.stringify({ member_id: memberId, custom_member_name: customName })) action = "change";

  await db.prepare(
    "INSERT INTO AssignmentAudit (schedule_id, service_item_id, member_id, custom_member_name, action, old_value, new_value, admin_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(scheduleId, serviceItemId, memberId, customName, action, oldVal, newVal, 0).run();

  return json({ message: "登記成功" });
}
