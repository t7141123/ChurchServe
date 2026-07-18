export async function getMemberScheduleAssignments(
  db: D1Database,
  groupId: number,
  yearMonth: string
): Promise<Record<string, Record<string, number | string>>> {
  const groupCheck = await db.prepare(
    "SELECT id FROM Groups WHERE id = ?"
  ).bind(groupId).first();

  if (!groupCheck) {
    throw new Error("Group not found");
  }

  const members = await db.prepare(
    "SELECT id, name FROM GroupMembers WHERE group_id = ? AND (is_active IS NULL OR is_active = 1) ORDER BY id ASC"
  ).bind(groupId).all();

  const items = await db.prepare(
    "SELECT id, name, display_order FROM ServiceItems WHERE group_id = ? AND (is_active IS NULL OR is_active = 1) ORDER BY display_order ASC"
  ).bind(groupId).all();

  const membersList = members.results as Array<{ id: number; name: string }>;
  const itemsList = items.results as Array<{ id: number; name: string; display_order: number }>;

  const schedule: Record<string, Record<string, number | string>> = {};

  for (const item of itemsList) {
    schedule[`item_${item.id}`] = { display_order: item.display_order, name: item.name };
  }

  for (const member of membersList) {
    const row: Record<string, number | string> = {};
    for (const item of itemsList) {
      const assignment = await db.prepare(
        `SELECT a.id, a.member_id, a.custom_member_name
         FROM ScheduleAssignments a
         WHERE a.schedule_year_month = ? AND a.service_item_id = ? AND a.member_id = ? AND a.group_id = ?
         LIMIT 1`
      ).bind(yearMonth, item.id, member.id, groupId).first() as { id: number; member_id: number; custom_member_name: string | null } | null;

      if (assignment) {
        row[`item_${item.id}`] = assignment.id;
      }
    }
    schedule[`member_${member.id}`] = { id: member.id, name: member.name, ...row };
  }

  return schedule;
}
