import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { getAuthAdmin, requireSuperAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export async function GET(request: Request) {
  try {
    const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin || !requireSuperAdmin(admin)) return jsonError("無權限", 403);

  const rows = await (env.DB as D1Database).prepare(
    "SELECT id, username, must_change_password, role, managed_group_id, created_at FROM Admins ORDER BY id"
  ).all();

  return json(rows.results);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "未知錯誤", 500);
  }
}

export async function POST(request: Request) {
  try {
    const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin || !requireSuperAdmin(admin)) return jsonError("無權限", 403);

  let body: { username?: string; password?: string; role?: string; managed_group_id?: number | null };
  try { body = await request.json(); } catch { return jsonError("無效的請求格式", 400); }

  if (!body.username?.trim() || !body.password?.trim()) return jsonError("帳號與密碼為必填", 400);
  if (!/^[a-z]+$/.test(body.username.trim())) return jsonError("帳號僅限小寫英文", 400);
  if (body.password.length < 8) return jsonError("密碼至少 8 碼", 400);
  if (!/[a-zA-Z]/.test(body.password) || !/[0-9]/.test(body.password)) return jsonError("密碼須包含英文與數字", 400);

  const existing = await (env.DB as D1Database).prepare(
    "SELECT id FROM Admins WHERE username = ? LIMIT 1"
  ).bind(body.username.trim()).first();
  if (existing) return jsonError("帳號名稱已存在", 409);

  const password_hash = await hashPassword(body.password);
  const role = body.role === "super_admin" ? "super_admin" : body.role === "district_leader" ? "district_leader" : "group_leader";

  if (role === "super_admin" && body.username.trim() !== "admin") {
    return jsonError("僅 admin 帳號可設為超級管理員", 403);
  }

  const managed_group_id = body.managed_group_id ?? null;

  await (env.DB as D1Database).prepare(
    "INSERT INTO Admins (username, password_hash, must_change_password, role, managed_group_id) VALUES (?, ?, 0, ?, ?)"
  ).bind(body.username.trim(), password_hash, role, managed_group_id).run();

  return json({ success: true }, 201);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "未知錯誤", 500);
  }
}
