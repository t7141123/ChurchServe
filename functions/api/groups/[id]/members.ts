import { json, jsonError } from "../../../_lib/response";
import { memberSchema, validateInput } from "../../../_lib/validate";
import { getAuthAdmin } from "../../../_lib/auth";
import { sanitize } from "../../../_lib/sanitize";

export async function onRequest(context: { request: Request; env: { DB: D1Database; JWT_SECRET: string }; params: { id: string } }): Promise<Response> {
  const admin = await getAuthAdmin(context.request, context.env.JWT_SECRET);
  if (!admin) {
    return jsonError("未授權", 401);
  }

  const groupId = Number(context.params.id);

  if (context.request.method === "GET") {
    const members = await context.env.DB.prepare(
      "SELECT id, name, is_active FROM GroupMembers WHERE group_id = ? ORDER BY id ASC"
    ).bind(groupId).all();

    return json(members.results);
  }

  if (context.request.method === "POST") {
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return jsonError("無效的請求格式", 400);
    }

    const parsed = validateInput(memberSchema, body);
    if (!parsed.success) {
      return jsonError(parsed.error, 400);
    }

    const result = await context.env.DB.prepare(
      "INSERT INTO GroupMembers (group_id, name) VALUES (?, ?)"
    ).bind(groupId, sanitize(parsed.data.name)).run();

    return json({ id: result.meta.last_row_id }, 201);
  }

  return jsonError("Method not allowed", 405);
}
