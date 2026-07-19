
interface ScheduleAssignment {
  id: number;
  schedule_id: number;
  member_id: number | null;
  custom_member_name: string | null;
  member_name: string | null;
  service_item_order: number;
}

interface ScheduleRow {
  id: number;
  date: string;
  is_special_event: number;
  event_title: string | null;
  is_locked: number;
  lock_message: string | null;
  remarks: string | null;
  assignments: {
    id: number;
    member_id: number | null;
    custom_member_name: string | null;
    member_name: string | null;
    service_item_order: number;
  }[];
}

// Helper to calculate all Saturdays of a given month
function getSaturdays(yearMonthStr: string): string[] {
  const [yearStr, monthStr] = yearMonthStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // JS month is 0-indexed
  const dates: string[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    if (d.getDay() === 6) {
      dates.push(
        `${year}-${String(month + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      );
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

export async function getMemberScheduleAssignments(
  db: D1Database,
  groupId: number,
  yearMonth: string
): Promise<ScheduleRow[]> {
  // Check if group exists
  const groupCheck = await db.prepare(
    "SELECT id FROM Groups WHERE id = ?"
  ).bind(groupId).first();

  if (!groupCheck) {
    throw new Error("Group not found");
  }

  // Auto-initialize Saturdays of the month
  const saturdays = getSaturdays(yearMonth);
  const insertStatements = saturdays.map((dateStr) =>
    db.prepare("INSERT OR IGNORE INTO DutySchedules (group_id, date) VALUES (?, ?)")
      .bind(groupId, dateStr)
  );
  await db.batch(insertStatements);

  // Fetch all schedules for this group and month
  const schedulesResult = await db.prepare(
    `SELECT id, date, is_special_event, event_title, is_locked, lock_message, remarks
     FROM DutySchedules
     WHERE group_id = ? AND date LIKE ?
     ORDER BY date ASC`
  ).bind(groupId, `${yearMonth}%`).all();

  const schedulesList = schedulesResult.results as Array<{
    id: number;
    date: string;
    is_special_event: number;
    event_title: string | null;
    is_locked: number;
    lock_message: string | null;
    remarks: string | null;
  }>;

  // Fetch all assignments for these schedules
  const assignmentsResult = await db.prepare(
    `SELECT a.id, a.schedule_id, a.member_id, a.custom_member_name, m.name as member_name, s.display_order as service_item_order
     FROM DutyAssignments a
     JOIN DutySchedules ds ON a.schedule_id = ds.id
     LEFT JOIN Members m ON a.member_id = m.id
     LEFT JOIN ServiceItems s ON a.service_item_id = s.id
     WHERE ds.group_id = ? AND ds.date LIKE ?`
  ).bind(groupId, `${yearMonth}%`).all();

  const assignmentsList = assignmentsResult.results as unknown as ScheduleAssignment[];

  // Group assignments by schedule_id
  const assignmentsByScheduleId: Record<number, ScheduleAssignment[]> = {};
  for (const a of assignmentsList) {
    if (!assignmentsByScheduleId[a.schedule_id]) {
      assignmentsByScheduleId[a.schedule_id] = [];
    }
    assignmentsByScheduleId[a.schedule_id].push(a);
  }

  // Format into final structure expected by frontend
  const result: ScheduleRow[] = schedulesList.map((s) => ({
    id: s.id,
    date: s.date,
    is_special_event: s.is_special_event,
    event_title: s.event_title,
    is_locked: s.is_locked,
    lock_message: s.lock_message,
    remarks: s.remarks,
    assignments: (assignmentsByScheduleId[s.id] || []).map((a) => ({
      id: a.id,
      member_id: a.member_id,
      custom_member_name: a.custom_member_name,
      member_name: a.member_name,
      service_item_order: a.service_item_order,
    })),
  }));

  return result;
}
