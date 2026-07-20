import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { getAuthAdmin, requireSuperAdmin } from "@/lib/auth";
import { sanitize } from "@/lib/sanitize";

export async function GET() {
  try {
    const { env } = await getCloudflareContext({ async: true });
  const districts = await (env.DB as D1Database).prepare(
    "SELECT id, name FROM Districts ORDER BY id ASC"
  ).all();
  return json(districts.results);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "未知錯誤", 500);
  }
}

export async function POST(request: Request) {
  try {
    const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin || !requireSuperAdmin(admin)) return jsonError("未授權", 401);

  let body: { name?: string };
  try { body = await request.json(); } catch { return jsonError("無效的請求格式", 400); }
  if (!body.name?.trim()) return jsonError("分區名稱為必填", 400);

  const result = await (env.DB as D1Database).prepare(
    "INSERT INTO Districts (name) VALUES (?)"
  ).bind(sanitize(body.name.trim())).run();

  return json({ id: result.meta.last_row_id }, 201);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "未知錯誤", 500);
  }
}
