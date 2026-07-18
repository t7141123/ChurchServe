import type { D1Database } from "./types";

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS Groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER REFERENCES Groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS ServiceItems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER REFERENCES Groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS Admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  must_change_password INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS LoginAttempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_address TEXT NOT NULL,
  attempted_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS DutySchedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER REFERENCES Groups(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  is_special_event INTEGER DEFAULT 0,
  event_title TEXT,
  is_locked INTEGER DEFAULT 0,
  lock_message TEXT,
  remarks TEXT,
  UNIQUE(group_id, date)
);

CREATE TABLE IF NOT EXISTS DutyAssignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER REFERENCES DutySchedules(id) ON DELETE CASCADE,
  service_item_id INTEGER REFERENCES ServiceItems(id),
  member_id INTEGER REFERENCES Members(id),
  custom_member_name TEXT,
  version INTEGER DEFAULT 1,
  UNIQUE(schedule_id, service_item_id)
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON LoginAttempts(ip_address, attempted_at);
CREATE INDEX IF NOT EXISTS idx_duty_schedules_group_date ON DutySchedules(group_id, date);
CREATE INDEX IF NOT EXISTS idx_duty_assignments_schedule ON DutyAssignments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_members_group ON Members(group_id, is_active);
`;

export const DEFAULT_SERVICE_ITEMS = [
  { name: "破冰（超好玩遊戲）", display_order: 1 },
  { name: "敬拜讚美 - 司琴/Youtube", display_order: 2 },
  { name: "敬拜讚美 - 主領", display_order: 3 },
  { name: "見證（經歷神）", display_order: 4 },
  { name: "信息分享", display_order: 5 },
  { name: "報告", display_order: 6 },
];

export const DEFAULT_MEMBERS = [
  "小明", "小華", "小美", "小強", "小玲",
];

export async function initializeDatabase(db: D1Database) {
  await db.exec(SCHEMA_SQL);

  const existing = await db.prepare("SELECT COUNT(*) as count FROM Groups").first<{ count: number }>();
  if (existing && existing.count > 0) return;

  await db.prepare("INSERT INTO Groups (name) VALUES (?)").bind("A24小組").run();

  const group = await db.prepare("SELECT id FROM Groups WHERE name = ?").bind("A24小組").first<{ id: number }>();
  if (!group) return;

  for (const item of DEFAULT_SERVICE_ITEMS) {
    await db.prepare("INSERT INTO ServiceItems (group_id, name, display_order) VALUES (?, ?, ?)")
      .bind(group.id, item.name, item.display_order)
      .run();
  }

  for (const name of DEFAULT_MEMBERS) {
    await db.prepare("INSERT INTO Members (group_id, name) VALUES (?, ?)")
      .bind(group.id, name)
      .run();
  }

  const { hashPassword } = await import("../auth/password");
  const adminHash = await hashPassword("admin123");
  await db.prepare("INSERT INTO Admins (username, password_hash, must_change_password) VALUES (?, ?, ?)")
    .bind("admin", adminHash, 1)
    .run();
}
