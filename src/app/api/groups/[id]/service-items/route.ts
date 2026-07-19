import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { serviceItemSchema, validateInput } from "@/lib/validate";
import { getAuthAdmin } from "@/lib/auth";
import { sanitize } from "@/lib/sanitize";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await getCloudflareContext({ async: true });

  const groupId = Number((await params).id);
  const items = await (env.DB as D1Database).prepare(
    "SELECT id, name, category, display_order, is_active FROM ServiceItems WHERE group_id = ? ORDER BY display_order ASC"
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
    "INSERT INTO ServiceItems (group_id, name, category, display_order) VALUES (?, ?, ?, ?)"
  ).bind(groupId, sanitize(parsed.data.name), parsed.data.category, parsed.data.display_order).run();

  return json({ id: result.meta.last_row_id }, 201);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  const groupId = Number((await params).id);

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return jsonError("無效的請求格式", 400); }

  const itemId = body.itemId || body.id;
  if (!itemId) return jsonError("缺少項目 ID", 400);

  const updateFields: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) {
    updateFields.push("name = ?");
    values.push(sanitize(String(body.name)));
  }
  if (body.category !== undefined) {
    updateFields.push("category = ?");
    values.push(String(body.category));
  }
  if (body.display_order !== undefined) {
    updateFields.push("display_order = ?");
    values.push(Number(body.display_order));
  }

  if (updateFields.length === 0) return jsonError("無需更新", 400);

  values.push(Number(itemId), groupId);

  await (env.DB as D1Database).prepare(
    `UPDATE ServiceItems SET ${updateFields.join(", ")} WHERE id = ? AND group_id = ?`
  ).bind(...values).run();

  return json({ message: "已更新" });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  const groupId = Number((await params).id);

  let body: Record<string, unknown> = {};
  try { body = await request.json(); }
  catch { /* ignore: try query param fallback */ }

  const itemId = body.itemId || body.id || Number(new URL(request.url).searchParams.get("id"));
  if (!itemId) return jsonError("缺少項目 ID", 400);

  await (env.DB as D1Database).prepare(
    "DELETE FROM DutyAssignments WHERE service_item_id = ?"
  ).bind(itemId).run();
  await (env.DB as D1Database).prepare(
    "DELETE FROM ServiceItems WHERE id = ? AND group_id = ?"
  ).bind(itemId, groupId).run();

  return json({ message: "已刪除" });
}
