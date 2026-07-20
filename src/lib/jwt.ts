import { SignJWT, jwtVerify } from "jose";

const JWT_EXPIRY = "24h";

interface Admin {
  id: number;
  username: string;
  must_change_password: number;
  role: string;
  managed_group_id: number | null;
  managed_campus_id: number | null;
}

export async function createToken(admin: Admin, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = encoder.encode(secret);

  return new SignJWT({
    sub: String(admin.id),
    username: admin.username,
    mustChangePassword: admin.must_change_password,
    role: admin.role,
    managedGroupId: admin.managed_group_id,
    managedCampusId: admin.managed_campus_id,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(key);
}

export interface JwtPayload {
  sub: string;
  username: string;
  mustChangePassword: number;
  role: string;
  managedGroupId: number | null;
  managedCampusId: number | null;
}

export async function verifyToken(
  token: string,
  secret: string
): Promise<JwtPayload | null> {
  try {
    const encoder = new TextEncoder();
    const key = encoder.encode(secret);
    const { payload } = await jwtVerify(token, key);
    return {
      sub: payload.sub as string,
      username: payload.username as string,
      mustChangePassword: payload.mustChangePassword as number,
      role: payload.role as string,
      managedGroupId: (payload.managedGroupId as number) ?? null,
      managedCampusId: (payload.managedCampusId as number) ?? null,
    };
  } catch {
    return null;
  }
}
