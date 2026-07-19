import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { getAuthAdmin } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  const scheduleId = Number((await params).id);

  let body: { remarks?: string };
  try {
    body = await request.json();
  } catch {
    return jsonError("無效的請求格式", 400);
  }

  const remarks = body.remarks ?? "";
  if (remarks.length > 500) return jsonError("備註不可超過 500 字元", 400);

  await (env.DB as D1Database).prepare(
    "UPDATE DutySchedules SET remarks = ? WHERE id = ?"
  ).bind(remarks, scheduleId).run();

  return json({ message: "已更新" });
}
