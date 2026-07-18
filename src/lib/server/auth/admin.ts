import { NextRequest } from "next/server";
import { verifyToken } from "./jwt";

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === "default-secret-change-this") {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return secret;
}

export function getAuthAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  return verifyToken(token, getJwtSecret());
}
