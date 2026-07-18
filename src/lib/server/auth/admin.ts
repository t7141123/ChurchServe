import { NextRequest } from "next/server";
import { verifyToken } from "./jwt";

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || "default-secret-change-this";
}

export function getAuthAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  return verifyToken(token, getJwtSecret());
}
