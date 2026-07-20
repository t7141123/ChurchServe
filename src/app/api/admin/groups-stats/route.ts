import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { getAuthAdmin } from "@/lib/auth";

async function getAccessibleGroupIds(admin: import("@/lib/jwt").JwtPayload, db: D1Database): Promise<number[]> {
  if (admin.role === "super_admin" || admin.role === "admin") {
    const rows = await db.prepare("SELECT id FROM Groups").all() as { results: { id: number }[] };
    return rows.results.map(r => r.id);
  }
  if (admin.role === "group_leader" && admin.managedGroupId) return [admin.managedGroupId];
  if (admin.role === "zone_leader" && admin.managedGroupId) {
    const rows = await db.prepare("SELECT id FROM Groups WHERE zone_id = ?").bind(admin.managedGroupId).all() as { results: { id: number }[] };
    return rows.results.map(r => r.id);
  }
  if (admin.role === "district_leader" && admin.managedGroupId) {
    const rows = await db.prepare(
      "SELECT g.id FROM Groups g JOIN Zones z ON g.zone_id = z.id WHERE z.district_id = ?"
    ).bind(admin.managedGroupId).all() as { results: { id: number }[] };
    return rows.results.map(r => r.id);
  }
  if (admin.role === "campus_leader" && admin.managedCampusId) {
    const rows = await db.prepare(
      "SELECT g.id FROM Groups g JOIN Zones z ON g.zone_id = z.id JOIN Districts d ON z.district_id = d.id WHERE d.campus_id = ?"
    ).bind(admin.managedCampusId).all() as { results: { id: number }[] };
    return rows.results.map(r => r.id);
  }
  return [];
}

export async function GET(request: Request) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
    if (!admin) return jsonError("未授權", 401);
    const db = env.DB as D1Database;

    const groupIds = await getAccessibleGroupIds(admin, db);
    if (groupIds.length === 0) return json([]);

    const placeholders = groupIds.map(() => "?").join(",");

    const stats = await db.prepare(
      `SELECT g.id, g.name, g.zone_id,
              (SELECT COUNT(*) FROM Members WHERE group_id = g.id AND is_active = 1) as active_member_count,
              (SELECT MIN(date) FROM DutySchedules WHERE group_id = g.id AND date >= date('now')) as next_date,
              (SELECT COUNT(*) FROM DutySchedules WHERE group_id = g.id) as schedule_count
       FROM Groups g
       WHERE g.id IN (${placeholders})
       ORDER BY g.id ASC`
    ).bind(...groupIds).all();

    return json(stats.results);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "未知錯誤", 500);
  }
}
