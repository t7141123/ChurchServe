import { json, jsonError } from "../../_lib/response";
import { specialEventSchema, validateInput } from "../../_lib/validate";
import { getAuthAdmin } from "../../_lib/auth";
import { sanitize } from "../../_lib/sanitize";

export async function onRequest(context: { request: Request; env: { DB: D1Database; JWT_SECRET: string }; params: Record<string, string> }): Promise<Response> {
  const admin = await getAuthAdmin(context.request, context.env.JWT_SECRET);
  if (!admin) {
    return jsonError("未授權", 401);
  }

  if (context.request.method === "GET") {
    const events = await context.env.DB.prepare(
      `SELECT se.*, g.name as group_name
       FROM SpecialEvents se JOIN Groups g ON se.group_id = g.id
       ORDER BY se.date DESC`
    ).all();

    return json(events.results);
  }

  if (context.request.method === "POST") {
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return jsonError("無效的請求格式", 400);
    }

    const parsed = validateInput(specialEventSchema, body);
    if (!parsed.success) {
      return jsonError(parsed.error, 400);
    }

    const result = await context.env.DB.prepare(
      "INSERT INTO SpecialEvents (group_id, date, event_title) VALUES (?, ?, ?)"
    ).bind(parsed.data.group_id, parsed.data.date, sanitize(parsed.data.event_title)).run();

    return json({ id: result.meta.last_row_id }, 201);
  }

  return jsonError("Method not allowed", 405);
}
