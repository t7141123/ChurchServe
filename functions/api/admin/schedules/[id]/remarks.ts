import { json, jsonError } from "../../../../_lib/response";
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

  let body: { remarks?: string };
  try {
    body = await context.request.json();
  } catch {
    return jsonError("無效的請求格式", 400);
  }

  const remarks = body.remarks ?? "";
  if (remarks.length > 500) {
    return jsonError("備註不可超過 500 字元", 400);
  }

  await context.env.DB.prepare(
    "UPDATE ScheduleAssignments SET remarks = ? WHERE id = ?"
  ).bind(remarks, scheduleId).run();

  return json({ message: "已更新" });
}
