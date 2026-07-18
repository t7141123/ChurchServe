import { json, jsonError } from "../../_lib/response";
import { changePasswordSchema, validateInput } from "../../_lib/validate";
import { hashPassword } from "../../_lib/password";
import { getAuthAdmin } from "../../_lib/auth";

export async function onRequest(context: { request: Request; env: { DB: D1Database; JWT_SECRET: string }; params: Record<string, string> }): Promise<Response> {
  if (context.request.method !== "POST") {
    return jsonError("Method not allowed", 405);
  }

  const admin = await getAuthAdmin(context.request, context.env.JWT_SECRET);
  if (!admin) {
    return jsonError("未授權", 401);
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonError("無效的請求格式", 400);
  }

  const parsed = validateInput(changePasswordSchema, body);
  if (!parsed.success) {
    return jsonError(parsed.error, 400);
  }

  const hashed = await hashPassword(parsed.data.newPassword);

  await context.env.DB.prepare(
    "UPDATE Admins SET password_hash = ?, must_change_password = 0 WHERE id = ?"
  ).bind(hashed, Number(admin.sub)).run();

  return json({ message: "密碼已更新" });
}
