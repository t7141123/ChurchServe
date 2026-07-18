import { json, jsonError } from "../_lib/response";
import { getAuthAdmin } from "../_lib/auth";

export async function onRequest(context: { request: Request; env: { DB: D1Database; JWT_SECRET: string }; params: Record<string, string> }): Promise<Response> {
  if (context.request.method !== "GET") {
    return jsonError("Method not allowed", 405);
  }

  const admin = await getAuthAdmin(context.request, context.env.JWT_SECRET);
  if (!admin) {
    return jsonError("未授權", 401);
  }

  const items = await context.env.DB.prepare(
    `SELECT si.id, si.name, si.display_order, si.group_id, g.name as group_name
     FROM ServiceItems si JOIN Groups g ON si.group_id = g.id
     WHERE (si.is_active IS NULL OR si.is_active = 1)
     ORDER BY g.id ASC, si.display_order ASC`
  ).all();

  return json(items.results);
}
