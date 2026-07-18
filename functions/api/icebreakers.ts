import { json, jsonError } from "../_lib/response";
import { icebreakerSchema, validateInput } from "../_lib/validate";
import { getAuthAdmin } from "../_lib/auth";

export async function onRequest(context: { request: Request; env: { DB: D1Database; JWT_SECRET: string }; params: Record<string, string> }): Promise<Response> {
  if (context.request.method === "GET") {
    const { searchParams } = new URL(context.request.url);
    const all = searchParams.get("all") === "1";

    let rows;
    if (all) {
      rows = await context.env.DB.prepare("SELECT * FROM Icebreakers ORDER BY category, name ASC").all();
    } else {
      rows = await context.env.DB.prepare("SELECT * FROM Icebreakers WHERE is_active = 1 ORDER BY category, name ASC").all();
    }

    return json(rows.results);
  }

  if (context.request.method === "POST") {
    const admin = await getAuthAdmin(context.request, context.env.JWT_SECRET);
    if (!admin) return jsonError("未授權", 401);

    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return jsonError("無效的請求格式", 400);
    }

    const parsed = validateInput(icebreakerSchema, body);
    if (!parsed.success) return jsonError(parsed.error, 400);

    const { name, description, category, duration, people_min, people_max, materials } = parsed.data;
    const result = await context.env.DB.prepare(
      "INSERT INTO Icebreakers (name, description, category, duration, people_min, people_max, materials) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(name, description, category, duration, people_min, people_max, materials).run();

    return json({ id: result.meta.last_row_id }, 201);
  }

  return jsonError("Method not allowed", 405);
}
