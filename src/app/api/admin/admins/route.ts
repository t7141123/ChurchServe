import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { getAuthAdmin, requireSuperAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export async function GET(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin || !requireSuperAdmin(admin)) return jsonError("無權限", 403);

  const rows = await (env.DB as D1Database).prepare(
    "SELECT id, username, must_change_password, role, managed_group_id, created_at FROM Admins ORDER BY id"
  ).all();

  return json(rows.results);
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin || !requireSuperAdmin(admin)) return jsonError("無權限", 403);

  let body: { username?: string; password?: string; role?: string; managed_group_id?: number | null };
  try { body = await request.json(); } catch { return jsonError("無效的請求格式", 400); }

  if (!body.username?.trim() || !body.password?.trim()) return jsonError("帳號與密碼為必填", 400);
  if (body.password.length < 6) return jsonError("密碼至少 6 碼", 400);

  const existing = await (env.DB as D1Database).prepare(
    "SELECT id FROM Admins WHERE username = ? LIMIT 1"
  ).bind(body.username.trim()).first();
  if (existing) return jsonError("帳號名稱已存在", 409);

  const password_hash = await hashPassword(body.password);
  const role = body.role === "super_admin" ? "super_admin" : "admin";
  const managed_group_id = body.managed_group_id ?? null;

  await (env.DB as D1Database).prepare(
    "INSERT INTO Admins (username, password_hash, must_change_password, role, managed_group_id) VALUES (?, ?, 0, ?, ?)"
  ).bind(body.username.trim(), password_hash, role, managed_group_id).run();

  return json({ success: true }, 201);
}
