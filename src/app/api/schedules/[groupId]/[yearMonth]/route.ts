import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { getAuthAdmin, requireGroupAccess } from "@/lib/auth";
import { getMemberScheduleAssignments } from "@/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ groupId: string; yearMonth: string }> }) {
  const { env } = await getCloudflareContext({ async: true });

  const { groupId: groupIdStr, yearMonth } = await params;
  const groupId = Number(groupIdStr);

  try {
    const schedule = await getMemberScheduleAssignments(env.DB as D1Database, groupId, yearMonth);
    return json(schedule);
  } catch (e) {
    const message = e instanceof Error ? e.message : "未知錯誤";
    return jsonError(message, 404);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ groupId: string; yearMonth: string }> }) {
  const { env } = await getCloudflareContext({ async: true });
  const { groupId: groupIdStr, yearMonth } = await params;
  const groupId = Number(groupIdStr);
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);
  if (!requireGroupAccess(admin, groupId)) return jsonError("無權限操作此小組", 403);
  const db = env.DB as D1Database;

  let body: { service_item_id?: number; member_id?: number | null; custom_member_name?: string | null };
  try { body = await request.json(); }
  catch { return jsonError("無效的請求格式", 400); }

  const serviceItemId = body.service_item_id;
  if (!serviceItemId) return jsonError("缺少服事項目 ID", 400);

  const memberId = body.member_id ?? null;
  const customName = body.custom_member_name ?? null;

  const schedules = await db.prepare(
    "SELECT id FROM DutySchedules WHERE group_id = ? AND date LIKE ?"
  ).bind(groupId, `${yearMonth}-%`).all<{ id: number }>();

  for (const s of schedules.results) {
    const current = await db.prepare(
      "SELECT member_id, custom_member_name FROM DutyAssignments WHERE schedule_id = ? AND service_item_id = ? LIMIT 1"
    ).bind(s.id, serviceItemId).first<{ member_id: number | null; custom_member_name: string | null }>();

    const existing = await db.prepare(
      "SELECT id FROM DutyAssignments WHERE schedule_id = ? AND service_item_id = ? LIMIT 1"
    ).bind(s.id, serviceItemId).first<{ id: number }>();

    if (existing) {
      await db.prepare(
        "UPDATE DutyAssignments SET member_id = ?, custom_member_name = ? WHERE id = ?"
      ).bind(memberId, customName, existing.id).run();
    } else {
      await db.prepare(
        "INSERT INTO DutyAssignments (schedule_id, service_item_id, member_id, custom_member_name) VALUES (?, ?, ?, ?)"
      ).bind(s.id, serviceItemId, memberId, customName).run();
    }

    // Audit each schedule
    const oldVal = current ? JSON.stringify({ member_id: current.member_id, custom_member_name: current.custom_member_name }) : null;
    const newVal = JSON.stringify({ member_id: memberId, custom_member_name: customName });
    let action = "assign";
    if (current && current.member_id !== null && memberId === null) action = "unassign";
    else if (current && JSON.stringify(current) !== JSON.stringify({ member_id: memberId, custom_member_name: customName })) action = "change";

    await db.prepare(
      "INSERT INTO AssignmentAudit (schedule_id, service_item_id, member_id, custom_member_name, action, old_value, new_value, admin_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(s.id, serviceItemId, memberId, customName, action, oldVal, newVal, Number(admin.sub)).run();
  }

  return json({ message: "已更新" });
}
