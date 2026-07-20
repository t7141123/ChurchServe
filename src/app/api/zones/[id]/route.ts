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

  const zoneId = Number(id);
  if (!Number.isFinite(zoneId)) return jsonError("無效的 ID", 400);

  let body: { name?: string };
  try { body = await request.json(); } catch { return jsonError("無效的請求格式", 400); }
  if (!body.name?.trim()) return jsonError("小區名稱為必填", 400);

  await (env.DB as D1Database).prepare(
    "UPDATE Zones SET name = ? WHERE id = ?"
  ).bind(sanitize(body.name.trim()), zoneId).run();

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

  const zoneId = Number(id);
  if (!Number.isFinite(zoneId)) return jsonError("無效的 ID", 400);

  await (env.DB as D1Database).prepare(
    "UPDATE Groups SET zone_id = NULL WHERE zone_id = ?"
  ).bind(zoneId).run();

  await (env.DB as D1Database).prepare(
    "UPDATE Admins SET managed_group_id = NULL WHERE role = 'zone_leader' AND managed_group_id = ?"
  ).bind(zoneId).run();

  await (env.DB as D1Database).prepare(
    "DELETE FROM Zones WHERE id = ?"
  ).bind(zoneId).run();

  return json({ success: true });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "未知錯誤", 500);
  }
}
