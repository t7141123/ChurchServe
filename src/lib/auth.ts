import { verifyToken } from "./jwt";
import type { JwtPayload } from "./jwt";

export function getAuthAdmin(request: Request, jwtSecret: string): Promise<JwtPayload | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return Promise.resolve(null);
  const token = authHeader.slice(7);
  return verifyToken(token, jwtSecret);
}

export function requireSuperAdmin(payload: JwtPayload | null): boolean {
  return payload?.role === "super_admin";
}

export async function requireGroupAccess(
  payload: JwtPayload | null,
  groupId: number,
  db?: D1Database
): Promise<boolean> {
  if (!payload) return false;
  if (payload.role === "super_admin" || payload.role === "admin") return true;
  if (payload.role === "group_leader") return payload.managedGroupId === groupId;
  if (payload.role === "district_leader" && payload.managedGroupId && db) {
    const row = await db.prepare(
      "SELECT id FROM Groups WHERE id = ? AND district_id = ? LIMIT 1"
    ).bind(groupId, payload.managedGroupId).first();
    return !!row;
  }
  return false;
}
