import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { getAuthAdmin, requireSuperAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin || !requireSuperAdmin(admin)) return jsonError("無權限", 403);

  const adminId = Number(id);
  if (!Number.isFinite(adminId)) return jsonError("無效的 ID", 400);

  const existing = await (env.DB as D1Database).prepare(
    "SELECT id FROM Admins WHERE id = ? LIMIT 1"
  ).bind(adminId).first();
  if (!existing) return jsonError("帳號不存在", 404);

  let body: { username?: string; password?: string; role?: string; managed_group_id?: number | null };
  try { body = await request.json(); } catch { return jsonError("無效的請求格式", 400); }

  const updates: string[] = [];
  const binds: unknown[] = [];

  if (body.username !== undefined) {
    if (!body.username.trim()) return jsonError("帳號不可為空", 400);
    const dup = await (env.DB as D1Database).prepare(
      "SELECT id FROM Admins WHERE username = ? AND id != ? LIMIT 1"
    ).bind(body.username.trim(), adminId).first();
    if (dup) return jsonError("帳號名稱已存在", 409);
    updates.push("username = ?");
    binds.push(body.username.trim());
  }

  if (body.password !== undefined) {
    if (body.password.length < 6 && body.password.length > 0) return jsonError("密碼至少 6 碼", 400);
    if (body.password.length > 0) {
      const password_hash = await hashPassword(body.password);
      updates.push("password_hash = ?");
      binds.push(password_hash);
    }
  }

  if (body.role !== undefined) {
    if (!["super_admin", "admin"].includes(body.role)) return jsonError("無效的角色", 400);
    updates.push("role = ?");
    binds.push(body.role);
  }

  if (body.managed_group_id !== undefined) {
    updates.push("managed_group_id = ?");
    binds.push(body.managed_group_id ?? null);
  }

  if (updates.length === 0) return json({ success: true });

  binds.push(adminId);
  await (env.DB as D1Database).prepare(
    `UPDATE Admins SET ${updates.join(", ")} WHERE id = ?`
  ).bind(...binds).run();

  return json({ success: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin || !requireSuperAdmin(admin)) return jsonError("無權限", 403);

  const adminId = Number(id);
  if (!Number.isFinite(adminId)) return jsonError("無效的 ID", 400);

  if (adminId === Number(admin.sub)) return jsonError("不能刪除自己的帳號", 400);

  const existing = await (env.DB as D1Database).prepare(
    "SELECT id FROM Admins WHERE id = ? LIMIT 1"
  ).bind(adminId).first();
  if (!existing) return jsonError("帳號不存在", 404);

  await (env.DB as D1Database).prepare(
    "DELETE FROM Admins WHERE id = ?"
  ).bind(adminId).run();

  return json({ success: true });
}
