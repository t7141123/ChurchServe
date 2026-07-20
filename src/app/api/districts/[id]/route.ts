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

  const districtId = Number(id);
  if (!Number.isFinite(districtId)) return jsonError("無效的 ID", 400);

  let body: { name?: string; campus_id?: number | null };
  try { body = await request.json(); } catch { return jsonError("無效的請求格式", 400); }
  if (!body.name?.trim()) return jsonError("牧區名稱為必填", 400);

  await (env.DB as D1Database).prepare(
    "UPDATE Districts SET name = ?, campus_id = ? WHERE id = ?"
  ).bind(sanitize(body.name.trim()), body.campus_id ?? null, districtId).run();

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

  const districtId = Number(id);
  if (!Number.isFinite(districtId)) return jsonError("無效的 ID", 400);

  await (env.DB as D1Database).prepare(
    "UPDATE Zones SET district_id = NULL WHERE district_id = ?"
  ).bind(districtId).run();

  await (env.DB as D1Database).prepare(
    "UPDATE Admins SET managed_group_id = NULL WHERE role = 'district_leader' AND managed_group_id = ?"
  ).bind(districtId).run();

  await (env.DB as D1Database).prepare(
    "DELETE FROM Districts WHERE id = ?"
  ).bind(districtId).run();

  return json({ success: true });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "未知錯誤", 500);
  }
}
