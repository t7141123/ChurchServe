import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { changePasswordSchema, validateInput } from "@/lib/validate";
import { hashPassword } from "@/lib/password";
import { getAuthAdmin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  let body: unknown;
  try { body = await request.json(); }
  catch { return jsonError("無效的請求格式", 400); }

  const parsed = validateInput(changePasswordSchema, body);
  if (!parsed.success) return jsonError(parsed.error, 400);

  const hashed = await hashPassword(parsed.data.newPassword);

  await (env.DB as D1Database).prepare(
    "UPDATE Admins SET password_hash = ?, must_change_password = 0 WHERE id = ?"
  ).bind(hashed, Number(admin.sub)).run();

  return json({ message: "密碼已更新" });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "未知錯誤", 500);
  }
}
