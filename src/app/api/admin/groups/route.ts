import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { getAuthAdmin } from "@/lib/auth";
import type { JwtPayload } from "@/lib/jwt";

async function buildGroupsQuery(admin: JwtPayload, db: D1Database) {
  const base = "SELECT g.id, g.name, g.is_active, g.district_id FROM Groups g";

  if (admin.role === "super_admin" || admin.role === "admin") {
    return db.prepare(`${base} ORDER BY g.id ASC`).all();
  }

  if (admin.role === "group_leader" && admin.managedGroupId) {
    return db.prepare(`${base} WHERE g.id = ? ORDER BY g.id ASC`).bind(admin.managedGroupId).all();
  }

  if (admin.role === "district_leader" && admin.managedGroupId) {
    return db.prepare(`${base} WHERE g.district_id = ? ORDER BY g.id ASC`).bind(admin.managedGroupId).all();
  }

  return { results: [] };
}

export async function GET(request: Request) {
  try {
    const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  const result = await buildGroupsQuery(admin, env.DB as D1Database);
  return json(result.results);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "未知錯誤", 500);
  }
}
