"use client";

import { useState, useEffect } from "react";

interface AuditEntry {
  id: number;
  schedule_id: number;
  service_item_id: number;
  member_id: number | null;
  custom_member_name: string | null;
  action: string;
  old_value: string | null;
  new_value: string | null;
  admin_id: number;
  created_at: string;
  service_item_name: string | null;
  member_name: string | null;
  group_name: string | null;
  date: string;
}

function authHeaders(): Record<string, string> {
  const t = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

const ACTION_LABELS: Record<string, string> = {
  assign: "指派",
  unassign: "取消指派",
  reassign: "變更",
};

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/audit", { headers: authHeaders() });
        if (!res.ok) throw new Error("載入失敗");
        setEntries(await res.json());
      } catch {
        setErrorMsg("載入異動記錄失敗");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      <div className="mb-8 animate-fadeIn">
        <h1 className="text-2xl font-bold font-serif text-[var(--color-primary-dark)] mb-1">異動記錄</h1>
        <p className="text-sm text-[var(--color-muted)]">檢視所有排班指派異動的歷史記錄</p>
      </div>

      {errorMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20 animate-fadeIn" role="alert">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="rounded-xl p-4 bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse">
              <div className="h-4 w-48 rounded bg-[var(--color-border-light)] mb-2" />
              <div className="h-3 w-32 rounded bg-[var(--color-border-light)]" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-border-light)] mb-4">
            <svg className="w-8 h-8 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <p className="text-sm text-[var(--color-muted)]">尚無異動記錄</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map(e => {
            const actionLabel = ACTION_LABELS[e.action] ?? e.action;
            const who = e.admin_id === 0 ? "一般用戶" : `管理員 #${e.admin_id}`;
            const what = e.service_item_name ?? "未知項目";
            const whom = e.member_name ?? e.custom_member_name ?? "未知人員";

            return (
              <div key={e.id} className="glass rounded-xl px-4 py-3 transition-all duration-200 hover:shadow-sm animate-fadeIn">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[var(--color-text)]">
                      <span className="font-medium">{actionLabel}</span>
                      {" — "}
                      <span className="font-semibold">{what}</span>
                      {" → "}
                      <span>{whom}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--color-muted)]">
                      <span>{e.group_name ?? "未知小組"}</span>
                      <span>·</span>
                      <span>{e.date ?? "未知日期"}</span>
                      <span>·</span>
                      <span>{who}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-[var(--color-muted)] whitespace-nowrap shrink-0">
                    {new Date(e.created_at).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
