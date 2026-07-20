import { getCloudflareContext } from "@opennextjs/cloudflare";
import { json, jsonError } from "@/lib/response";
import { getAuthAdmin, requireSuperAdmin } from "@/lib/auth";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { env } = await getCloudflareContext({ async: true });
    const admin = await getAuthAdmin(request, env.JWT_SECRET as string);
    if (!admin || !requireSuperAdmin(admin)) return jsonError("未授權", 401);

    const auditId = Number(id);
    if (!Number.isFinite(auditId)) return jsonError("無效的 ID", 400);

    await (env.DB as D1Database).prepare(
      "DELETE FROM AssignmentAudit WHERE id = ?"
    ).bind(auditId).run();

    return json({ success: true });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "未知錯誤", 500);
  }
}
