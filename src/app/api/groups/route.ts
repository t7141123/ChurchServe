import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { initializeDatabase } from "@/lib/server/db/schema";
import { getAuthAdmin } from "@/lib/server/auth/admin";
import { groupSchema, validateInput } from "@/lib/server/middleware/validate";

let dbInitialized = false;

export async function GET() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;
    const result = await db.prepare("SELECT * FROM Groups ORDER BY id").all();
    return NextResponse.json({ success: true, data: result.results });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAuthAdmin(request);
    if (!admin) {
      return NextResponse.json({ success: false, error: "未授權" }, { status: 401 });
    }

    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;

    if (!dbInitialized) {
      await initializeDatabase(db as any);
      dbInitialized = true;
    }

    const body = await request.json();
    const validation = validateInput(groupSchema, body);
    if (!validation.success) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    await db.prepare("INSERT INTO Groups (name) VALUES (?)").bind(validation.data.name.trim()).run();
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to create group" },
      { status: 500 }
    );
  }
}
