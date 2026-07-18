import { json, jsonError } from "../../../../_lib/response";
import { lockScheduleSchema, validateInput } from "../../../../_lib/validate";
import { getAuthAdmin } from "../../../../_lib/auth";

export async function onRequest(context: { request: Request; env: { DB: D1Database; JWT_SECRET: string }; params: { id: string } }): Promise<Response> {
  if (context.request.method !== "PUT") {
    return jsonError("Method not allowed", 405);
  }

  const admin = await getAuthAdmin(context.request, context.env.JWT_SECRET);
  if (!admin) {
    return jsonError("未授權", 401);
  }

  const scheduleId = Number(context.params.id);

  let body: { is_locked?: number; lock_message?: string | null };
  try {
    body = await context.request.json();
  } catch {
    return jsonError("無效的請求格式", 400);
  }

  const parsed = validateInput(lockScheduleSchema, body);
  if (!parsed.success) {
    return jsonError(parsed.error, 400);
  }

  await context.env.DB.prepare(
    "UPDATE ScheduleAssignments SET is_locked = ?, lock_message = ? WHERE id = ?"
  ).bind(parsed.data.is_locked, parsed.data.lock_message ?? null, scheduleId).run();

  return json({ message: parsed.data.is_locked ? "已鎖定" : "已解鎖" });
}
