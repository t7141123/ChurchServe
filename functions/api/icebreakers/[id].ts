import { json, jsonError } from "../../_lib/response";
import { icebreakerSchema, validateInput } from "../../_lib/validate";
import { getAuthAdmin } from "../../_lib/auth";

export async function onRequest(context: { request: Request; env: { DB: D1Database; JWT_SECRET: string }; params: { id: string } }): Promise<Response> {
  const admin = await getAuthAdmin(context.request, context.env.JWT_SECRET);
  if (!admin) return jsonError("未授權", 401);

  const id = Number(context.params.id);

  if (context.request.method === "PUT") {
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return jsonError("無效的請求格式", 400);
    }

    const parsed = validateInput(icebreakerSchema, body);
    if (!parsed.success) return jsonError(parsed.error, 400);

    const { name, description, category, duration, people_min, people_max, materials, is_active } = parsed.data;
    await context.env.DB.prepare(
      `UPDATE Icebreakers SET name = ?, description = ?, category = ?, duration = ?, people_min = ?, people_max = ?, materials = ?, is_active = COALESCE(?, is_active) WHERE id = ?`
    ).bind(name, description, category, duration, people_min, people_max, materials, is_active ?? null, id).run();

    return json({ message: "已更新" });
  }

  if (context.request.method === "DELETE") {
    await context.env.DB.prepare("DELETE FROM Icebreakers WHERE id = ?").bind(id).run();
    return json({ message: "已刪除" });
  }

  return jsonError("Method not allowed", 405);
}
