import { json, jsonError } from "../../../_lib/response";
import { serviceItemSchema, validateInput } from "../../../_lib/validate";
import { getAuthAdmin } from "../../../_lib/auth";
import { sanitize } from "../../../_lib/sanitize";

export async function onRequest(context: { request: Request; env: { DB: D1Database; JWT_SECRET: string }; params: { id: string } }): Promise<Response> {
  const admin = await getAuthAdmin(context.request, context.env.JWT_SECRET);
  if (!admin) {
    return jsonError("未授權", 401);
  }

  const groupId = Number(context.params.id);

  if (context.request.method === "GET") {
    const items = await context.env.DB.prepare(
      "SELECT id, name, display_order, is_active FROM ServiceItems WHERE group_id = ? ORDER BY display_order ASC"
    ).bind(groupId).all();

    return json(items.results);
  }

  if (context.request.method === "POST") {
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return jsonError("無效的請求格式", 400);
    }

    const parsed = validateInput(serviceItemSchema, body);
    if (!parsed.success) {
      return jsonError(parsed.error, 400);
    }

    const result = await context.env.DB.prepare(
      "INSERT INTO ServiceItems (group_id, name, display_order) VALUES (?, ?, ?)"
    ).bind(groupId, sanitize(parsed.data.name), parsed.data.display_order).run();

    return json({ id: result.meta.last_row_id }, 201);
  }

  if (context.request.method === "PUT") {
    let body: { id?: number; name?: string; display_order?: number };
    try {
      body = await context.request.json();
    } catch {
      return jsonError("無效的請求格式", 400);
    }

    if (!body.id) {
      return jsonError("缺少項目 ID", 400);
    }

    const parsed = validateInput(serviceItemSchema, body);
    if (!parsed.success) {
      return jsonError(parsed.error, 400);
    }

    await context.env.DB.prepare(
      "UPDATE ServiceItems SET name = ?, display_order = ? WHERE id = ? AND group_id = ?"
    ).bind(sanitize(parsed.data.name), parsed.data.display_order, body.id, groupId).run();

    return json({ message: "已更新" });
  }

  if (context.request.method === "DELETE") {
    const url = new URL(context.request.url);
    const itemId = Number(url.searchParams.get("id"));
    if (!itemId) {
      return jsonError("缺少項目 ID", 400);
    }

    await context.env.DB.prepare("DELETE FROM ScheduleAssignments WHERE service_item_id = ? AND group_id = ?").bind(itemId, groupId).run();
    await context.env.DB.prepare("DELETE FROM ServiceItems WHERE id = ? AND group_id = ?").bind(itemId, groupId).run();

    return json({ message: "已刪除" });
  }

  return jsonError("Method not allowed", 405);
}
