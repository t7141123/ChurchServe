import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getAuthAdmin } from "@/lib/server/auth/admin";
import { lockScheduleSchema, validateInput } from "@/lib/server/middleware/validate";

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
    const validation = validateInput(lockScheduleSchema, body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    await db.prepare(
      "UPDATE DutySchedules SET is_locked = ?, lock_message = ? WHERE id = ?"
    ).bind(validation.data.is_locked, validation.data.lock_message || null, Number(id)).run();

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
