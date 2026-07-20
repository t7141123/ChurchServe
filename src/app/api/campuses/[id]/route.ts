import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { getAuthAdmin, requireSuperAdmin } from "@/lib/auth";
import { sanitize } from "@/lib/sanitize";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin || !requireSuperAdmin(admin)) return jsonError("未授權", 401);

  const campusId = Number(id);
  if (!Number.isFinite(campusId)) return jsonError("無效的 ID", 400);

  let body: { name?: string };
  try { body = await request.json(); } catch { return jsonError("無效的請求格式", 400); }
  if (!body.name?.trim()) return jsonError("分堂名稱為必填", 400);

  await (env.DB as D1Database).prepare(
    "UPDATE Campuses SET name = ? WHERE id = ?"
  ).bind(sanitize(body.name.trim()), campusId).run();

  return json({ success: true });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "未知錯誤", 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin || !requireSuperAdmin(admin)) return jsonError("未授權", 401);

  const campusId = Number(id);
  if (!Number.isFinite(campusId)) return jsonError("無效的 ID", 400);

  await (env.DB as D1Database).prepare(
    "UPDATE Districts SET campus_id = NULL WHERE campus_id = ?"
  ).bind(campusId).run();

  await (env.DB as D1Database).prepare(
    "UPDATE Admins SET managed_campus_id = NULL WHERE managed_campus_id = ?"
  ).bind(campusId).run();

  await (env.DB as D1Database).prepare(
    "DELETE FROM Campuses WHERE id = ?"
  ).bind(campusId).run();

  return json({ success: true });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "未知錯誤", 500);
  }
}
