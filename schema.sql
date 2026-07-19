CREATE TABLE IF NOT EXISTS Groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
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
  category TEXT DEFAULT '',
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

CREATE TABLE IF NOT EXISTS Icebreakers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  duration TEXT NOT NULL DEFAULT '',
  people_min INTEGER DEFAULT 0,
  people_max INTEGER DEFAULT 0,
  materials TEXT NOT NULL DEFAULT '',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
