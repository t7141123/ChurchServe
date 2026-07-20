import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { icebreakerSchema, validateInput } from "@/lib/validate";
import { getAuthAdmin } from "@/lib/auth";
import { sanitize } from "@/lib/sanitize";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  const id = Number((await params).id);

  let body: unknown;
  try { body = await request.json(); }
  catch { return jsonError("無效的請求格式", 400); }

  const parsed = validateInput(icebreakerSchema, body);
  if (!parsed.success) return jsonError(parsed.error, 400);

  const { name, description, category, duration, people_min, people_max, materials, is_active } = parsed.data;
  await env.DB.prepare(
    "UPDATE Icebreakers SET name = ?, description = ?, category = ?, duration = ?, people_min = ?, people_max = ?, materials = ?, is_active = COALESCE(?, is_active) WHERE id = ?"
  ).bind(sanitize(name), sanitize(description), sanitize(category), sanitize(duration), people_min, people_max, sanitize(materials), is_active ?? null, id).run();

  return json({ message: "已更新" });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "未知錯誤", 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  const id = Number((await params).id);
  await env.DB.prepare("DELETE FROM Icebreakers WHERE id = ?").bind(id).run();
  return json({ message: "已刪除" });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "未知錯誤", 500);
  }
}
