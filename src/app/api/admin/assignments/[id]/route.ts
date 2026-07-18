import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifyToken } from "@/lib/server/auth/jwt";
import { sanitize } from "@/lib/server/middleware/sanitize";

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
    const { member_id, custom_member_name } = body;

    const sanitizedName = custom_member_name ? sanitize(custom_member_name) : null;

    const existing = await db.prepare(
      "SELECT id FROM DutyAssignments WHERE id = ?"
    ).bind(Number(id)).first();

    if (existing) {
      await db.prepare(
        "UPDATE DutyAssignments SET member_id = ?, custom_member_name = ?, version = version + 1 WHERE id = ?"
      ).bind(member_id || null, sanitizedName, Number(id)).run();
    } else {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
