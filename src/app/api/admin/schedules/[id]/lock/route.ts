import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { lockScheduleSchema, validateInput } from "@/lib/validate";
import { getAuthAdmin } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  const scheduleId = Number((await params).id);

  let body: { is_locked?: number; lock_message?: string | null };
  try {
    body = await request.json();
  } catch {
    return jsonError("無效的請求格式", 400);
  }

  const parsed = validateInput(lockScheduleSchema, body);
  if (!parsed.success) return jsonError(parsed.error, 400);

  await (env.DB as D1Database).prepare(
    "UPDATE DutySchedules SET is_locked = ?, lock_message = ? WHERE id = ?"
  ).bind(parsed.data.is_locked, parsed.data.lock_message ?? null, scheduleId).run();

  return json({ message: parsed.data.is_locked ? "已鎖定" : "已解鎖" });
}
