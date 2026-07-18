export interface Group {
  id: number;
  name: string;
  created_at: string;
}

export interface Member {
  id: number;
  group_id: number;
  name: string;
  is_active: number;
}

export interface ServiceItem {
  id: number;
  group_id: number;
  name: string;
  display_order: number;
  is_active: number;
}

export interface DutySchedule {
  id: number;
  group_id: number;
  date: string;
  is_special_event: number;
  event_title: string | null;
  is_locked: number;
  lock_message: string | null;
  remarks: string | null;
}

export interface DutyAssignment {
  id: number;
  schedule_id: number;
  service_item_id: number;
  member_id: number | null;
  custom_member_name: string | null;
  version: number;
}

export interface Admin {
  id: number;
  username: string;
  password_hash: string;
  must_change_password: number;
  created_at: string;
}

export interface ScheduleWithAssignments extends DutySchedule {
  assignments: (DutyAssignment & {
    service_item_name: string;
    service_item_order: number;
    member_name: string | null;
  })[];
}

export interface Icebreaker {
  id: number;
  name: string;
  description: string;
  category: string;
  duration: string;
  people_min: number;
  people_max: number;
  materials: string;
  is_active: number;
  created_at?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
