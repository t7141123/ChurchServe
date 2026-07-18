import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "請輸入帳號").max(50),
  password: z.string().min(1, "請輸入密碼").max(100),
});

export const changePasswordSchema = z.object({
  newPassword: z.string().min(6, "密碼至少 6 個字元").max(100),
});

export const groupSchema = z.object({
  name: z.string().min(1, "小組名稱不可為空").max(100),
});

export const memberSchema = z.object({
  name: z.string().min(1, "姓名不可為空").max(50),
  is_active: z.number().min(0).max(1).optional(),
});

export const serviceItemSchema = z.object({
  name: z.string().min(1, "項目名稱不可為空").max(100),
  display_order: z.number().min(0),
});

export const assignmentSchema = z.object({
  member_id: z.number().nullable().optional(),
  custom_member_name: z.string().max(50).nullable().optional(),
}).refine(
  (data) => data.member_id !== null && data.member_id !== undefined || 
    (data.custom_member_name !== null && data.custom_member_name !== undefined && data.custom_member_name !== ""),
  { message: "請選擇成員或輸入姓名" }
);

export const specialEventSchema = z.object({
  group_id: z.number(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式 YYYY-MM-DD"),
  event_title: z.string().min(1, "活動名稱不可為空").max(200),
});

export const lockScheduleSchema = z.object({
  is_locked: z.number().min(0).max(1),
  lock_message: z.string().max(500).nullable().optional(),
});

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errorMessage = result.error.issues.map((e) => e.message).join(", ");
  return { success: false, error: errorMessage };
}
