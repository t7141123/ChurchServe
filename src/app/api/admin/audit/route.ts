import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { getAuthAdmin } from "@/lib/auth";
import type { JwtPayload } from "@/lib/jwt";

async function getAccessibleGroupIds(admin: JwtPayload, db: D1Database): Promise<number[]> {
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
    const rows = await db.prepare(
      `SELECT a.id, a.schedule_id, a.service_item_id, a.member_id, a.custom_member_name,
              a.action, a.old_value, a.new_value, a.admin_id, a.created_at,
              si.name as service_item_name, m.name as member_name,
              g.name as group_name, ds.date
       FROM AssignmentAudit a
       LEFT JOIN ServiceItems si ON a.service_item_id = si.id
       LEFT JOIN Members m ON a.member_id = m.id
       LEFT JOIN DutySchedules ds ON a.schedule_id = ds.id
       LEFT JOIN Groups g ON ds.group_id = g.id
       WHERE ds.group_id IN (${placeholders})
       ORDER BY a.created_at DESC
       LIMIT 200`
    ).bind(...groupIds).all();

    return json(rows.results);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "未知錯誤", 500);
  }
}
