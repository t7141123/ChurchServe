import { json, jsonError } from "../../_lib/response";
import { groupSchema, validateInput } from "../../_lib/validate";
import { getAuthAdmin } from "../../_lib/auth";
import { sanitize } from "../../_lib/sanitize";

export async function onRequest(context: { request: Request; env: { DB: D1Database; JWT_SECRET: string }; params: { id: string } }): Promise<Response> {
  const admin = await getAuthAdmin(context.request, context.env.JWT_SECRET);
  if (!admin) {
    return jsonError("未授權", 401);
  }

  const groupId = Number(context.params.id);

  if (context.request.method === "PUT") {
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return jsonError("無效的請求格式", 400);
    }

    const parsed = validateInput(groupSchema, body);
    if (!parsed.success) {
      return jsonError(parsed.error, 400);
    }

    await context.env.DB.prepare(
      "UPDATE Groups SET name = ? WHERE id = ?"
    ).bind(sanitize(parsed.data.name), groupId).run();

    return json({ message: "已更新" });
  }

  if (context.request.method === "DELETE") {
    await context.env.DB.prepare("DELETE FROM ScheduleAssignments WHERE group_id = ?").bind(groupId).run();
    await context.env.DB.prepare("DELETE FROM ServiceItems WHERE group_id = ?").bind(groupId).run();
    await context.env.DB.prepare("DELETE FROM GroupMembers WHERE group_id = ?").bind(groupId).run();
    await context.env.DB.prepare("DELETE FROM Groups WHERE id = ?").bind(groupId).run();

    return json({ message: "已刪除" });
  }

  return jsonError("Method not allowed", 405);
}
