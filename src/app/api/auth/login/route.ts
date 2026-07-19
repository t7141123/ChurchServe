import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { loginSchema, validateInput } from "@/lib/validate";
import { verifyPassword } from "@/lib/password";
import { createToken } from "@/lib/jwt";
import { checkD1RateLimit, resetD1RateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });

  const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
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
    "SELECT id, username, password_hash, must_change_password FROM Admins WHERE username = ? LIMIT 1"
  ).bind(parsed.data.username).first() as { id: number; username: string; password_hash: string; must_change_password: number } | null;

  if (!admin) return jsonError("帳號或密碼錯誤", 401);

  const valid = await verifyPassword(parsed.data.password, admin.password_hash);
  if (!valid) return jsonError("帳號或密碼錯誤", 401);

  await resetD1RateLimit(env.DB as D1Database, `login:${clientIp}`);

  const token = await createToken(
    { id: admin.id, username: admin.username, must_change_password: admin.must_change_password },
    env.JWT_SECRET as string
  );

  return json({
    token,
    must_change_password: admin.must_change_password,
    admin: { id: admin.id, username: admin.username },
  });
}
