import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { memberSchema, validateInput } from "@/lib/validate";
import { getAuthAdmin } from "@/lib/auth";
import { sanitize } from "@/lib/sanitize";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = await getCloudflareContext({ async: true });

  const groupId = Number((await params).id);
  const members = await (env.DB as D1Database).prepare(
    "SELECT id, name, is_active FROM Members WHERE group_id = ? ORDER BY id ASC"
  ).bind(groupId).all();

  return json(members.results);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  const groupId = Number((await params).id);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("無效的請求格式", 400);
  }

  const parsed = validateInput(memberSchema, body);
  if (!parsed.success) return jsonError(parsed.error, 400);

  const result = await (env.DB as D1Database).prepare(
    "INSERT INTO Members (group_id, name) VALUES (?, ?)"
  ).bind(groupId, sanitize(parsed.data.name)).run();

  return json({ id: result.meta.last_row_id }, 201);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  const groupId = Number((await params).id);
  let body: { memberId?: number; name?: string };
  try { body = await request.json(); }
  catch { return jsonError("無效的請求格式", 400); }
  if (!body.memberId || !body.name?.trim()) return jsonError("缺少必要欄位", 400);

  await (env.DB as D1Database).prepare(
    "UPDATE Members SET name = ? WHERE id = ? AND group_id = ?"
  ).bind(sanitize(body.name.trim()), body.memberId, groupId).run();

  return json({ message: "已更新" });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  const groupId = Number((await params).id);
  let body: { memberId?: number; is_active?: number };
  try { body = await request.json(); }
  catch { return jsonError("無效的請求格式", 400); }
  if (!body.memberId || body.is_active === undefined) return jsonError("缺少必要欄位", 400);

  await (env.DB as D1Database).prepare(
    "UPDATE Members SET is_active = ? WHERE id = ? AND group_id = ?"
  ).bind(body.is_active, body.memberId, groupId).run();

  return json({ message: "已更新" });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  const groupId = Number((await params).id);
  let body: { memberId?: number };
  try { body = await request.json(); }
  catch { return jsonError("無效的請求格式", 400); }
  if (!body.memberId) return jsonError("缺少成員 ID", 400);

  const db = env.DB as D1Database;
  await db.prepare(
    "DELETE FROM DutyAssignments WHERE member_id = ?"
  ).bind(body.memberId).run();
  await db.prepare(
    "DELETE FROM Members WHERE id = ? AND group_id = ?"
  ).bind(body.memberId, groupId).run();

  return json({ message: "已刪除" });
}
