import { json, jsonError } from "../../../_lib/response";
import { getAuthAdmin } from "../../../_lib/auth";
import { getMemberScheduleAssignments } from "../../../_lib/db";

export async function onRequest(context: { request: Request; env: { DB: D1Database; JWT_SECRET: string }; params: { groupId: string; yearMonth: string } }): Promise<Response> {
  const admin = await getAuthAdmin(context.request, context.env.JWT_SECRET);
  if (!admin) {
    return jsonError("未授權", 401);
  }

  const groupId = Number(context.params.groupId);
  const yearMonth = context.params.yearMonth;

  if (context.request.method === "GET") {
    try {
      const schedule = await getMemberScheduleAssignments(context.env.DB, groupId, yearMonth);
      return json(schedule);
    } catch (e) {
      const message = e instanceof Error ? e.message : "未知錯誤";
      return jsonError(message, 404);
    }
  }

  if (context.request.method === "PUT") {
    let body: { service_item_id?: number; member_id?: number | null; custom_member_name?: string | null };
    try {
      body = await context.request.json();
    } catch {
      return jsonError("無效的請求格式", 400);
    }

    const serviceItemId = body.service_item_id;
    if (!serviceItemId) {
      return jsonError("缺少服事項目 ID", 400);
    }

    const existing = await context.env.DB.prepare(
      "SELECT id FROM ScheduleAssignments WHERE schedule_year_month = ? AND service_item_id = ? AND member_id = ? AND group_id = ? LIMIT 1"
    ).bind(yearMonth, serviceItemId, body.member_id ?? null, groupId).first() as { id: number } | null;

    if (existing) {
      await context.env.DB.prepare(
        "UPDATE ScheduleAssignments SET member_id = ?, custom_member_name = ? WHERE id = ?"
      ).bind(body.member_id ?? null, body.custom_member_name ?? null, existing.id).run();
    } else {
      await context.env.DB.prepare(
        "INSERT INTO ScheduleAssignments (schedule_year_month, service_item_id, member_id, custom_member_name, group_id) VALUES (?, ?, ?, ?, ?)"
      ).bind(yearMonth, serviceItemId, body.member_id ?? null, body.custom_member_name ?? null, groupId).run();
    }

    return json({ message: "已更新" });
  }

  return jsonError("Method not allowed", 405);
}
