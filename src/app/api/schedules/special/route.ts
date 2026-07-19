import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { specialEventSchema, validateInput } from "@/lib/validate";
import { getAuthAdmin, requireGroupAccess } from "@/lib/auth";
import { sanitize } from "@/lib/sanitize";

export async function GET(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  const events = await (env.DB as D1Database).prepare(
    `SELECT ds.*, g.name as group_name
     FROM DutySchedules ds JOIN Groups g ON ds.group_id = g.id
     WHERE ds.is_special_event = 1
     ORDER BY ds.date DESC`
  ).all();

  return json(events.results);
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("無效的請求格式", 400);
  }

  const parsed = validateInput(specialEventSchema, body);
  if (!parsed.success) return jsonError(parsed.error, 400);

  if (!requireGroupAccess(admin, parsed.data.group_id)) return jsonError("無權限操作此小組", 403);

  const result = await (env.DB as D1Database).prepare(
    `INSERT INTO DutySchedules (group_id, date, is_special_event, event_title)
     VALUES (?, ?, 1, ?)
     ON CONFLICT(group_id, date)
     DO UPDATE SET is_special_event = 1, event_title = excluded.event_title`
  ).bind(parsed.data.group_id, parsed.data.date, sanitize(parsed.data.event_title)).run();

  return json({ id: result.meta.last_row_id }, 201);
}
