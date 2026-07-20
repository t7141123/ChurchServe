import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const scheduleId = Number((await params).scheduleId);

    const schedule = await (env.DB as D1Database).prepare(
      "SELECT id FROM DutySchedules WHERE id = ? LIMIT 1"
    ).bind(scheduleId).first() as { id: number } | null;
    if (!schedule) return jsonError("找不到排班記錄", 404);

    let body: { remarks?: string };
    try { body = await request.json(); } catch { return jsonError("無效的請求格式", 400); }

    const remarks = body.remarks ?? "";
    if (remarks.length > 500) return jsonError("備註不可超過 500 字元", 400);

    await (env.DB as D1Database).prepare(
      "UPDATE DutySchedules SET remarks = ? WHERE id = ?"
    ).bind(remarks, scheduleId).run();

    return json({ message: "已更新" });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "未知錯誤", 500);
  }
}
