import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { groupSchema, validateInput } from "@/lib/validate";
import { getAuthAdmin } from "@/lib/auth";
import { sanitize } from "@/lib/sanitize";

export async function GET() {
  const { env } = await getCloudflareContext({ async: true });
  const groups = await (env.DB as D1Database).prepare(
    "SELECT id, name, is_active, district_id FROM Groups ORDER BY id ASC"
  ).all();
  return json(groups.results);
}

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);
  if (admin.role === "group_leader") return jsonError("無權限", 403);

  let body: unknown;
  try { body = await request.json(); }
  catch { return jsonError("無效的請求格式", 400); }

  const parsed = validateInput(groupSchema, body);
  if (!parsed.success) return jsonError(parsed.error, 400);

  let districtId: number | null = parsed.data.district_id ?? null;
  if (admin.role === "district_leader") {
    districtId = admin.managedGroupId;
  }

  const result = await (env.DB as D1Database).prepare(
    "INSERT INTO Groups (name, district_id) VALUES (?, ?)"
  ).bind(sanitize(parsed.data.name), districtId).run();

  return json({ id: result.meta.last_row_id }, 201);
}
