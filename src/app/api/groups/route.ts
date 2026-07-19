import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { groupSchema, validateInput } from "@/lib/validate";
import { getAuthAdmin, requireSuperAdmin } from "@/lib/auth";
import { sanitize } from "@/lib/sanitize";

export async function GET() {
  const { env } = await getCloudflareContext({ async: true });
  const groups = await (env.DB as D1Database).prepare(
    "SELECT id, name, is_active FROM Groups ORDER BY id ASC"
  ).all();
  return json(groups.results);
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin || !requireSuperAdmin(admin)) return jsonError("未授權", 401);

  let body: unknown;
  try { body = await request.json(); }
  catch { return jsonError("無效的請求格式", 400); }

  const parsed = validateInput(groupSchema, body);
  if (!parsed.success) return jsonError(parsed.error, 400);

  const result = await (env.DB as D1Database).prepare(
    "INSERT INTO Groups (name) VALUES (?)"
  ).bind(sanitize(parsed.data.name)).run();

  return json({ id: result.meta.last_row_id }, 201);
}
