import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifyPassword } from "@/lib/server/auth/password";
import { createToken } from "@/lib/server/auth/jwt";
import { checkRateLimit } from "@/lib/server/middleware/rate-limit";
import { getJwtSecret } from "@/lib/server/auth/admin";

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
         request.headers.get("x-real-ip") || 
         "unknown";
}

export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;

    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`login:${ip}`, 5, 900000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "登入嘗試次數過多，請 15 分鐘後再試" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "請輸入帳號和密碼" },
        { status: 400 }
      );
    }

    const admin = await db.prepare(
      "SELECT * FROM Admins WHERE username = ?"
    ).bind(username).first<{
      id: number;
      username: string;
      password_hash: string;
      must_change_password: number;
    }>();

    if (!admin) {
      return NextResponse.json(
        { success: false, error: "帳號或密碼錯誤" },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, admin.password_hash);
    if (!valid) {
      return NextResponse.json(
        { success: false, error: "帳號或密碼錯誤" },
        { status: 401 }
      );
    }

    const token = await createToken(admin as unknown as Parameters<typeof createToken>[0], getJwtSecret());

    return NextResponse.json({
      success: true,
      data: {
        token,
        mustChangePassword: admin.must_change_password === 1,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "登入失敗" },
      { status: 500 }
    );
  }
}
