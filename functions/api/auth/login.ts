import { json, jsonError } from "../../_lib/response";
import { loginSchema, validateInput } from "../../_lib/validate";
import { verifyPassword } from "../../_lib/password";
import { createToken } from "../../_lib/jwt";
import { checkD1RateLimit, resetD1RateLimit } from "../../_lib/rate-limit";

export async function onRequest(context: { request: Request; env: { DB: D1Database; JWT_SECRET: string }; params: Record<string, string> }): Promise<Response> {
  if (context.request.method !== "POST") {
    return jsonError("Method not allowed", 405);
  }

  const clientIp = context.request.headers.get("cf-connecting-ip") || "unknown";
  const rateCheck = await checkD1RateLimit(context.env.DB, `login:${clientIp}`, 5, 60000);
  if (!rateCheck.allowed) {
    return jsonError("登入嘗試次數過多，請稍後再試", 429);
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonError("無效的請求格式", 400);
  }

  const parsed = validateInput(loginSchema, body);
  if (!parsed.success) {
    return jsonError(parsed.error, 400);
  }

  const admin = await context.env.DB.prepare(
    "SELECT id, username, password_hash, must_change_password FROM Admins WHERE username = ? LIMIT 1"
  ).bind(parsed.data.username).first() as { id: number; username: string; password_hash: string; must_change_password: number } | null;

  if (!admin) {
    return jsonError("帳號或密碼錯誤", 401);
  }

  const valid = await verifyPassword(parsed.data.password, admin.password_hash);
  if (!valid) {
    return jsonError("帳號或密碼錯誤", 401);
  }

  await resetD1RateLimit(context.env.DB, `login:${clientIp}`);

  const token = await createToken(
    { id: admin.id, username: admin.username, must_change_password: admin.must_change_password },
    context.env.JWT_SECRET
  );

  return json({
    token,
    must_change_password: admin.must_change_password,
    admin: { id: admin.id, username: admin.username },
  });
}
