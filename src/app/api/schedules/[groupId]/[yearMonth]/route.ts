import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { getAuthAdmin } from "@/lib/auth";
import { getMemberScheduleAssignments } from "@/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ groupId: string; yearMonth: string }> }) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

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
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  const { groupId: groupIdStr, yearMonth } = await params;
  const groupId = Number(groupIdStr);
  const db = env.DB as D1Database;

  let body: { service_item_id?: number; member_id?: number | null; custom_member_name?: string | null };
  try { body = await request.json(); }
  catch { return jsonError("無效的請求格式", 400); }

  const serviceItemId = body.service_item_id;
  if (!serviceItemId) return jsonError("缺少服事項目 ID", 400);

  const existing = await db.prepare(
    "SELECT id FROM ScheduleAssignments WHERE schedule_year_month = ? AND service_item_id = ? AND member_id = ? AND group_id = ? LIMIT 1"
  ).bind(yearMonth, serviceItemId, body.member_id ?? null, groupId).first() as { id: number } | null;

  if (existing) {
    await db.prepare(
      "UPDATE ScheduleAssignments SET member_id = ?, custom_member_name = ? WHERE id = ?"
    ).bind(body.member_id ?? null, body.custom_member_name ?? null, existing.id).run();
  } else {
    await db.prepare(
      "INSERT INTO ScheduleAssignments (schedule_year_month, service_item_id, member_id, custom_member_name, group_id) VALUES (?, ?, ?, ?, ?)"
    ).bind(yearMonth, serviceItemId, body.member_id ?? null, body.custom_member_name ?? null, groupId).run();
  }

  return json({ message: "已更新" });
}
