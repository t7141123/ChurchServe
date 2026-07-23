import { getCloudflareContext } from "@opennextjs/cloudflare";

function getDayName(d: string): string {
  const names = ["日", "一", "二", "三", "四", "五", "六"];
  return names[new Date(d).getDay()];
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatYm(ym: string): string {
  const [y, m] = ym.split("-");
  return `${y}年${Number(m)}月`;
}

function generateScheduleSvg(
  schedule: Array<{ id: number; date: string; is_special_event: number; event_title: string | null; remarks: string | null }>,
  assignments: Array<{ schedule_id: number; service_item_id: number; member_name: string | null; custom_member_name: string | null }>,
  serviceItems: Array<{ id: number; name: string; category: string; display_order: number }>,
  groupName: string,
  months: string[]
): string {
  const sortedItems = [...serviceItems].sort((a, b) => a.display_order - b.display_order);
  const colWidth = 140;
  const rowHeight = 48;
  const headerH = 50;
  const titleH = 60;
  const labelW = 80;
  const remarksW = 120;
  const tableW = labelW + sortedItems.length * colWidth + remarksW;
  const tableH = titleH + headerH + schedule.length * rowHeight + 20;
  const w = Math.max(tableW + 40, 600);
  const h = Math.max(tableH + 40, 400);
  const ox = (w - tableW) / 2;
  const oy = 20;

  const assoc = new Map<string, string | null>();
  for (const a of assignments) {
    assoc.set(`${a.schedule_id}|${a.service_item_id}`, a.member_name ?? a.custom_member_name ?? null);
  }

  const lines: string[] = [];
  lines.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`);
  lines.push(`<defs><style>text{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}</style></defs>`);
  lines.push(`<rect width="${w}" height="${h}" rx="16" fill="#ffffff"/>`);

  const title = months.length > 1
    ? `${escapeXml(groupName)} ${formatYm(months[0])}-${formatYm(months[1])}服事表`
    : `${escapeXml(groupName)} ${formatYm(months[0])}服事表`;
  lines.push(`<text x="${w / 2}" y="${oy + 38}" text-anchor="middle" font-size="22" font-weight="700" fill="#1a1a2e">${title}</text>`);

  const x0 = ox;
  const y0 = oy + titleH;

  lines.push(`<rect x="${x0}" y="${y0}" width="${tableW}" height="${headerH}" rx="8" fill="#f0f4f8"/>`);
  lines.push(`<text x="${x0 + labelW / 2}" y="${y0 + headerH / 2 + 1}" text-anchor="middle" font-size="13" font-weight="600" fill="#4a5568" dominant-baseline="middle">日期</text>`);
  sortedItems.forEach((item, ci) => {
    const cx = x0 + labelW + ci * colWidth + colWidth / 2;
    lines.push(`<text x="${cx}" y="${y0 + headerH / 2 + 1}" text-anchor="middle" font-size="12" font-weight="600" fill="#4a5568" dominant-baseline="middle">${escapeXml(item.name)}</text>`);
  });
  const remarksCx = x0 + labelW + sortedItems.length * colWidth + remarksW / 2;
  lines.push(`<text x="${remarksCx}" y="${y0 + headerH / 2 + 1}" text-anchor="middle" font-size="12" font-weight="600" fill="#4a5568" dominant-baseline="middle">備註</text>`);

  schedule.forEach((row, ri) => {
    const ry = y0 + headerH + ri * rowHeight;
    const isEven = ri % 2 === 0;
    if (isEven) {
      lines.push(`<rect x="${x0}" y="${ry}" width="${tableW}" height="${rowHeight}" fill="#fafafa"/>`);
    }

    const dateStr = row.date.slice(5);
    const dayName = getDayName(row.date);
    const isWeekend = dayName === "六" || dayName === "日";
    const dateColor = row.is_special_event ? "#d97706" : isWeekend ? "#e53e3e" : "#1a202c";
    lines.push(`<text x="${x0 + labelW / 2}" y="${ry + rowHeight / 2 + 1}" text-anchor="middle" font-size="13" fill="${dateColor}" dominant-baseline="middle">${dateStr}(${dayName})</text>`);

    if (row.event_title) {
      lines.push(`<text x="${x0 + labelW / 2}" y="${ry + 34}" text-anchor="middle" font-size="10" fill="#a0aec0">${escapeXml(row.event_title)}</text>`);
    }

    sortedItems.forEach((item, ci) => {
      const cx = x0 + labelW + ci * colWidth + colWidth / 2;
      const key = `${row.id}|${item.id}`;
      const memberName = assoc.get(key);
      if (memberName) {
        lines.push(`<text x="${cx}" y="${ry + rowHeight / 2 + 1}" text-anchor="middle" font-size="12" fill="#2d3748" dominant-baseline="middle">${escapeXml(memberName)}</text>`);
      }
    });
  });

  for (let ri = 0; ri <= schedule.length; ri++) {
    const ly = y0 + headerH + ri * rowHeight;
    lines.push(`<line x1="${x0}" y1="${ly}" x2="${x0 + tableW}" y2="${ly}" stroke="#e2e8f0" stroke-width="1"/>`);
  }

  for (let ci = 0; ci <= sortedItems.length + 1; ci++) {
    const lx = ci <= sortedItems.length
      ? x0 + labelW + ci * colWidth
      : x0 + labelW + sortedItems.length * colWidth + remarksW;
    lines.push(`<line x1="${lx}" y1="${y0}" x2="${lx}" y2="${y0 + headerH + schedule.length * rowHeight}" stroke="#e2e8f0" stroke-width="1"/>`);
  }

  lines.push("</svg>");
  return lines.join("\n");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string; yearMonth: string }> }
) {
  const { env } = await getCloudflareContext({ async: true });
  const { groupId: groupIdStr, yearMonth } = await params;
  const groupId = Number(groupIdStr);
  const db = env.DB as D1Database;

  const url = new URL(request.url);
  const month2 = url.searchParams.get("month2");
  const months = month2 ? [yearMonth, month2] : [yearMonth];

  const group = await db.prepare("SELECT name FROM Groups WHERE id = ?").bind(groupId).first<{ name: string }>();
  if (!group) {
    return new Response("小組不存在", { status: 404 });
  }

  try {
    const scheduleResults = await Promise.all(
      months.map((m) =>
        db.prepare(
          `SELECT id, date, is_special_event, event_title, remarks
           FROM DutySchedules
           WHERE group_id = ? AND date LIKE ?
           ORDER BY date ASC`
        ).bind(groupId, `${m}%`).all<{ id: number; date: string; is_special_event: number; event_title: string | null; remarks: string | null }>()
      )
    );
    const schedule = scheduleResults.flatMap((r) => r.results);

    if (schedule.length === 0) {
      return new Response("該月尚無服事表", { status: 404 });
    }

    const serviceItemsResult = await db.prepare(
      `SELECT id, name, category, display_order
       FROM ServiceItems
       WHERE group_id = ? AND is_active = 1
       ORDER BY display_order ASC`
    ).bind(groupId).all<{ id: number; name: string; category: string; display_order: number }>();

    const serviceItems = serviceItemsResult.results;

    if (serviceItems.length === 0) {
      return new Response("小組尚無服事項目", { status: 404 });
    }

    const scheduleIds = schedule.map((s) => s.id);
    const placeholders = scheduleIds.map(() => "?").join(",");

    const assignmentsResult = await db.prepare(
      `SELECT ds.date as schedule_date, a.schedule_id, a.member_id, a.custom_member_name, a.service_item_id, m.name as member_name
       FROM DutyAssignments a
       JOIN DutySchedules ds ON a.schedule_id = ds.id
       LEFT JOIN Members m ON a.member_id = m.id
       WHERE a.schedule_id IN (${placeholders})`
    ).bind(...scheduleIds).all<{
      schedule_date: string;
      schedule_id: number;
      member_id: number | null;
      custom_member_name: string | null;
      service_item_id: number;
      member_name: string | null;
    }>();

    const svg = generateScheduleSvg(schedule, assignmentsResult.results, serviceItems, group.name, months);
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    return new Response(`無法產生圖片: ${e instanceof Error ? e.message : "unknown"}`, { status: 500 });
  }
}
