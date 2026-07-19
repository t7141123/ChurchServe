import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { getAuthAdmin, requireGroupAccess, requireSuperAdmin } from "@/lib/auth";
import { sanitize } from "@/lib/sanitize";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await getCloudflareContext({ async: true });

  const groupId = Number((await params).id);
  const group = await (env.DB as D1Database).prepare(
    "SELECT id, name, district_id FROM Groups WHERE id = ?"
  ).bind(groupId).first();

  if (!group) return jsonError("小組不存在", 404);
  return json(group);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  const groupId = Number((await params).id);
  if (!await requireGroupAccess(admin, groupId, env.DB as D1Database)) return jsonError("無權限操作此小組", 403);

  let body: { name?: string; district_id?: number | null };
  try { body = await request.json(); }
  catch { return jsonError("無效的請求格式", 400); }

  const updates: string[] = [];
  const binds: unknown[] = [];

  if (body.name !== undefined) {
    if (!body.name.trim()) return jsonError("小組名稱不可為空", 400);
    updates.push("name = ?");
    binds.push(sanitize(body.name.trim()));
  }

  if (body.district_id !== undefined) {
    const isSuper = requireSuperAdmin(admin);
    if (!isSuper) return jsonError("僅超級管理員可變更分區", 403);
    updates.push("district_id = ?");
    binds.push(body.district_id ?? null);
  }

  if (updates.length === 0) return json({ message: "無變更" });

  binds.push(groupId);
  await (env.DB as D1Database).prepare(
    `UPDATE Groups SET ${updates.join(", ")} WHERE id = ?`
  ).bind(...binds).run();

  return json({ message: "已更新" });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  const groupId = Number((await params).id);
  if (!await requireGroupAccess(admin, groupId, env.DB as D1Database)) return jsonError("無權限操作此小組", 403);

  const db = env.DB as D1Database;

  // Cascade delete in normalized relational order
  await db.prepare("DELETE FROM DutyAssignments WHERE schedule_id IN (SELECT id FROM DutySchedules WHERE group_id = ?)").bind(groupId).run();
  await db.prepare("DELETE FROM DutySchedules WHERE group_id = ?").bind(groupId).run();
  await db.prepare("DELETE FROM ServiceItems WHERE group_id = ?").bind(groupId).run();
  await db.prepare("DELETE FROM Members WHERE group_id = ?").bind(groupId).run();
  await db.prepare("DELETE FROM Groups WHERE id = ?").bind(groupId).run();

  return json({ message: "已刪除" });
}
