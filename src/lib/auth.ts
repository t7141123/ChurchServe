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

export function requireGroupAccess(payload: JwtPayload | null, groupId: number): boolean {
  if (!payload) return false;
  if (payload.role === "super_admin" || payload.role === "admin") return true;
  return payload.managedGroupId === groupId;
}
