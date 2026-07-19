import { SignJWT, jwtVerify } from "jose";

const JWT_EXPIRY = "24h";

interface Admin {
  id: number;
  username: string;
  must_change_password: number;
}

export async function createToken(admin: Admin, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = encoder.encode(secret);

  return new SignJWT({
    sub: String(admin.id),
    username: admin.username,
    mustChangePassword: admin.must_change_password,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(key);
}

export async function verifyToken(
  token: string,
  secret: string
): Promise<{ sub: string; username: string; mustChangePassword: number } | null> {
  try {
    const encoder = new TextEncoder();
    const key = encoder.encode(secret);
    const { payload } = await jwtVerify(token, key);
    return {
      sub: payload.sub as string,
      username: payload.username as string,
      mustChangePassword: payload.mustChangePassword as number,
    };
  } catch {
    return null;
  }
}
