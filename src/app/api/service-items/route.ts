import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { getAuthAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  const items = await (env.DB as D1Database).prepare(
    `SELECT si.id, si.name, si.display_order, si.group_id, g.name as group_name
     FROM ServiceItems si JOIN Groups g ON si.group_id = g.id
     WHERE (si.is_active IS NULL OR si.is_active = 1)
     ORDER BY g.id ASC, si.display_order ASC`
  ).all();

  return json(items.results);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "未知錯誤", 500);
  }
}
