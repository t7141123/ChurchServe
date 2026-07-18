import { verifyToken } from "./jwt";

export function getAuthAdmin(request: Request, jwtSecret: string) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  return verifyToken(token, jwtSecret);
}
