import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { icebreakerSchema, validateInput } from "@/lib/validate";
import { getAuthAdmin } from "@/lib/auth";
import { sanitize } from "@/lib/sanitize";

export async function GET(request: Request) {
  try {
    const { env } = await getCloudflareContext({ async: true });
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "1";

  let rows;
  if (all) {
    rows = await env.DB.prepare("SELECT * FROM Icebreakers ORDER BY category, name ASC").all();
  } else {
    rows = await env.DB.prepare("SELECT * FROM Icebreakers WHERE is_active = 1 ORDER BY category, name ASC").all();
  }

  return json(rows.results);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "未知錯誤", 500);
  }
}

export async function POST(request: Request) {
  try {
    const { env } = await getCloudflareContext({ async: true });
  const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
  if (!admin) return jsonError("未授權", 401);

  let body: unknown;
  try { body = await request.json(); }
  catch { return jsonError("無效的請求格式", 400); }

  const parsed = validateInput(icebreakerSchema, body);
  if (!parsed.success) return jsonError(parsed.error, 400);

  const { name, description, category, duration, people_min, people_max, materials } = parsed.data;
  const result = await env.DB.prepare(
    "INSERT INTO Icebreakers (name, description, category, duration, people_min, people_max, materials) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(sanitize(name), sanitize(description), sanitize(category), sanitize(duration), people_min, people_max, sanitize(materials)).run();

  return json({ id: result.meta.last_row_id }, 201);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "未知錯誤", 500);
  }
}
