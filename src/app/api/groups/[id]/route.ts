import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { groupSchema, validateInput } from "@/lib/validate";
import { getAuthAdmin } from "@/lib/auth";
import { sanitize } from "@/lib/sanitize";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await getCloudflareContext({ async: true });

  const groupId = Number((await params).id);
  const group = await (env.DB as D1Database).prepare(
    "SELECT id, name FROM Groups WHERE id = ?"
  ).bind(groupId).first();

  if (!group) return jsonError("小組不存在", 404);
  return json(group);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  const groupId = Number((await params).id);

  let body: unknown;
  try { body = await request.json(); }
  catch { return jsonError("無效的請求格式", 400); }

  const parsed = validateInput(groupSchema, body);
  if (!parsed.success) return jsonError(parsed.error, 400);

  await (env.DB as D1Database).prepare(
    "UPDATE Groups SET name = ? WHERE id = ?"
  ).bind(sanitize(parsed.data.name), groupId).run();

  return json({ message: "已更新" });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  const groupId = Number((await params).id);
  const db = env.DB as D1Database;

  // Cascade delete in normalized relational order
  await db.prepare("DELETE FROM DutyAssignments WHERE schedule_id IN (SELECT id FROM DutySchedules WHERE group_id = ?)").bind(groupId).run();
  await db.prepare("DELETE FROM DutySchedules WHERE group_id = ?").bind(groupId).run();
  await db.prepare("DELETE FROM ServiceItems WHERE group_id = ?").bind(groupId).run();
  await db.prepare("DELETE FROM Members WHERE group_id = ?").bind(groupId).run();
  await db.prepare("DELETE FROM Groups WHERE id = ?").bind(groupId).run();

  return json({ message: "已刪除" });
}
