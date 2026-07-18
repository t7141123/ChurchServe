import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { initializeDatabase } from "@/lib/server/db/schema";

let dbInitialized = false;

export async function GET(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;
    const result = await db.prepare("SELECT * FROM Groups ORDER BY id").all();
    return NextResponse.json({ success: true, data: result.results });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;

    if (!dbInitialized) {
      await initializeDatabase(db as Parameters<typeof initializeDatabase>[0]);
      dbInitialized = true;
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "小組名稱不可為空" },
        { status: 400 }
      );
    }

    const result = await db.prepare("INSERT INTO Groups (name) VALUES (?)").bind(name.trim()).run();
    return NextResponse.json({ success: true, data: { id: result } }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to create group" },
      { status: 500 }
    );
  }
}
