import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const db = env.DB;
    const result = await db.prepare(
      "SELECT id, name, display_order FROM ServiceItems ORDER BY display_order"
    ).all();
    return NextResponse.json({ success: true, data: result.results });
  } catch {
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
