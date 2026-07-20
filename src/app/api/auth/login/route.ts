import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { loginSchema, validateInput } from "@/lib/validate";
import { verifyPassword } from "@/lib/password";
import { createToken } from "@/lib/jwt";
import { checkD1RateLimit, resetD1RateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });

  try {
    const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
    
    if (!env.DB) {
      return jsonError("資料庫未綁定，請在 Cloudflare Pages 設定中關聯 D1 資料庫", 400);
    }

    const rateCheck = await checkD1RateLimit(env.DB as D1Database, `login:${clientIp}`, 5, 60000);
    if (!rateCheck.allowed) {
      return jsonError("登入嘗試次數過多，請稍後再試", 429);
    }

    let body: unknown;
    try { body = await request.json(); }
    catch { return jsonError("無效的請求格式", 400); }

    const parsed = validateInput(loginSchema, body);
    if (!parsed.success) return jsonError(parsed.error, 400);

    const admin = await (env.DB as D1Database).prepare(
      "SELECT id, username, password_hash, must_change_password, role, managed_group_id, managed_campus_id FROM Admins WHERE username = ? LIMIT 1"
    ).bind(parsed.data.username).first() as { id: number; username: string; password_hash: string; must_change_password: number; role: string; managed_group_id: number | null; managed_campus_id: number | null } | null;

    if (!admin) return jsonError("帳號或密碼錯誤", 401);

    const valid = await verifyPassword(parsed.data.password, admin.password_hash);
    if (!valid) return jsonError("帳號或密碼錯誤", 401);

    await resetD1RateLimit(env.DB as D1Database, `login:${clientIp}`);

    if (!env.JWT_SECRET) {
      return jsonError("JWT_SECRET 環境變數未設定，請在 Cloudflare Pages 中新增設定", 400);
    }

    const token = await createToken(
      { id: admin.id, username: admin.username, must_change_password: admin.must_change_password, role: admin.role, managed_group_id: admin.managed_group_id, managed_campus_id: admin.managed_campus_id },
      env.JWT_SECRET as string
    );

    return json({
      token,
      must_change_password: admin.must_change_password,
      admin: { id: admin.id, username: admin.username, role: admin.role, managed_group_id: admin.managed_group_id, managed_campus_id: admin.managed_campus_id },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "未知錯誤";
    return jsonError(`登入系統異常: ${msg}`, 400);
  }
}
