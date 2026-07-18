import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifyToken } from "@/lib/server/auth/jwt";
import { hashPassword } from "@/lib/server/auth/password";

function getAuthAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const jwtSecret = process.env.JWT_SECRET || "default-secret-change-this";
  return verifyToken(token, jwtSecret);
}

export async function PUT(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;

    const admin = await getAuthAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "未授權" }, { status: 401 });
    }

    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "密碼至少 6 個字元" },
        { status: 400 }
      );
    }

    const hash = await hashPassword(newPassword);
    await db.prepare(
      "UPDATE Admins SET password_hash = ?, must_change_password = 0 WHERE id = ?"
    ).bind(hash, Number(admin.sub)).run();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
