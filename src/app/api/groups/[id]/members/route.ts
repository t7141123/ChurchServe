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
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

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
