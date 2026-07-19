import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { serviceItemSchema, validateInput } from "@/lib/validate";
import { getAuthAdmin } from "@/lib/auth";
import { sanitize } from "@/lib/sanitize";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  const groupId = Number((await params).id);
  const items = await (env.DB as D1Database).prepare(
    "SELECT id, name, display_order, is_active FROM ServiceItems WHERE group_id = ? ORDER BY display_order ASC"
  ).bind(groupId).all();

  return json(items.results);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  const groupId = Number((await params).id);

  let body: unknown;
  try { body = await request.json(); }
  catch { return jsonError("無效的請求格式", 400); }

  const parsed = validateInput(serviceItemSchema, body);
  if (!parsed.success) return jsonError(parsed.error, 400);

  const result = await (env.DB as D1Database).prepare(
    "INSERT INTO ServiceItems (group_id, name, display_order) VALUES (?, ?, ?)"
  ).bind(groupId, sanitize(parsed.data.name), parsed.data.display_order).run();

  return json({ id: result.meta.last_row_id }, 201);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  const groupId = Number((await params).id);

  let body: { id?: number; name?: string; display_order?: number };
  try { body = await request.json(); }
  catch { return jsonError("無效的請求格式", 400); }

  if (!body.id) return jsonError("缺少項目 ID", 400);

  const parsed = validateInput(serviceItemSchema, body);
  if (!parsed.success) return jsonError(parsed.error, 400);

  await (env.DB as D1Database).prepare(
    "UPDATE ServiceItems SET name = ?, display_order = ? WHERE id = ? AND group_id = ?"
  ).bind(sanitize(parsed.data.name), parsed.data.display_order, body.id, groupId).run();

  return json({ message: "已更新" });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  const groupId = Number((await params).id);
  const url = new URL(request.url);
  const itemId = Number(url.searchParams.get("id"));
  if (!itemId) return jsonError("缺少項目 ID", 400);

  await (env.DB as D1Database).prepare(
    "DELETE FROM DutyAssignments WHERE service_item_id = ?"
  ).bind(itemId).run();
  await (env.DB as D1Database).prepare(
    "DELETE FROM ServiceItems WHERE id = ? AND group_id = ?"
  ).bind(itemId, groupId).run();

  return json({ message: "已刪除" });
}
