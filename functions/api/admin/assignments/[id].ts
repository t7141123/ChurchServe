import { json, jsonError } from "../../../_lib/response";
import { assignmentSchema, validateInput } from "../../../_lib/validate";
import { getAuthAdmin } from "../../../_lib/auth";
import { sanitize } from "../../../_lib/sanitize";

export async function onRequest(context: { request: Request; env: { DB: D1Database; JWT_SECRET: string }; params: { id: string } }): Promise<Response> {
  if (context.request.method !== "PUT") {
    return jsonError("Method not allowed", 405);
  }

  const admin = await getAuthAdmin(context.request, context.env.JWT_SECRET);
  if (!admin) {
    return jsonError("未授權", 401);
  }

  const assignmentId = Number(context.params.id);

  let body: { member_id?: number | null; custom_member_name?: string | null };
  try {
    body = await context.request.json();
  } catch {
    return jsonError("無效的請求格式", 400);
  }

  const parsed = validateInput(assignmentSchema, body);
  if (!parsed.success) {
    return jsonError(parsed.error, 400);
  }

  const memberId = parsed.data.member_id ?? null;
  const customName = parsed.data.custom_member_name ? sanitize(parsed.data.custom_member_name) : null;

  await context.env.DB.prepare(
    "UPDATE ScheduleAssignments SET member_id = ?, custom_member_name = ? WHERE id = ?"
  ).bind(memberId, customName, assignmentId).run();

  return json({ message: "已更新" });
}
