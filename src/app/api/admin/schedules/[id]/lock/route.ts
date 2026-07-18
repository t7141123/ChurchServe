import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifyToken } from "@/lib/server/auth/jwt";

function getAuthAdmin(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const jwtSecret = process.env.JWT_SECRET || "default-secret-change-this";
  return verifyToken(token, jwtSecret);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;

    const admin = await getAuthAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "未授權" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { is_locked, lock_message } = body;

    await db.prepare(
      "UPDATE DutySchedules SET is_locked = ?, lock_message = ? WHERE id = ?"
    ).bind(is_locked, lock_message || null, Number(id)).run();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
