"use client";

import { useState, useEffect, startTransition } from "react";

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

function checkSuperAdmin(): boolean {
  try {
    const t = localStorage.getItem("admin_token");
    if (!t) return false;
    const p = JSON.parse(atob(t.split(".")[1]));
    return p.role === "super_admin";
  } catch { return false; }
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
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [isSuperAdmin] = useState(() => checkSuperAdmin());

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/audit", { headers: authHeaders() });
      if (!res.ok) throw new Error("載入失敗");
      setEntries(await res.json());
    } catch {
      setErrorMsg("載入異動記錄失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { startTransition(() => { load(); }); }, []);

  useEffect(() => {
    if (errorMsg) { const t = setTimeout(() => setErrorMsg(""), 3000); return () => clearTimeout(t); }
  }, [errorMsg]);

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/audit/${id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "刪除失敗"); }
      setDeleteConfirm(null);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  const handleDeleteAll = async () => {
    try {
      const res = await fetch("/api/admin/audit", {
        method: "DELETE", headers: authHeaders(),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "刪除失敗"); }
      setDeleteAllConfirm(false);
      setEntries([]);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  return (
    <>
      <div className="mb-8 animate-fadeIn">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-serif text-[var(--color-primary-dark)] mb-1">異動記錄</h1>
            <p className="text-sm text-[var(--color-muted)]">檢視所有排班指派異動的歷史記錄</p>
          </div>
          {isSuperAdmin && entries.length > 0 && (
            <button onClick={() => setDeleteAllConfirm(true)}
              className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--color-danger)] hover:bg-[var(--color-danger-dark)] transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
              刪除全部
            </button>
          )}
        </div>
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
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-[var(--color-muted)] whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {isSuperAdmin && (
                      <button onClick={() => setDeleteConfirm(e.id)} aria-label="刪除記錄"
                        className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition-all"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-[var(--color-surface)] rounded-2xl shadow-2xl border border-[var(--color-border)] w-full max-w-sm animate-fadeIn p-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-danger-soft)] text-[var(--color-danger)] mb-4">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <h2 className="text-lg font-bold font-serif text-[var(--color-text)] mb-2">確認刪除此筆記錄</h2>
            <p className="text-xs text-[var(--color-danger)] mb-6">此操作無法復原</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-light)] bg-[var(--color-bg)] hover:bg-[var(--color-border-light)] transition-all"
              >取消</button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-[var(--color-danger)] hover:bg-[var(--color-danger-dark)] transition-all"
              >確認刪除</button>
            </div>
          </div>
        </div>
      )}

      {deleteAllConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteAllConfirm(false)} />
          <div className="relative bg-[var(--color-surface)] rounded-2xl shadow-2xl border border-[var(--color-border)] w-full max-w-sm animate-fadeIn p-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-danger-soft)] text-[var(--color-danger)] mb-4">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <h2 className="text-lg font-bold font-serif text-[var(--color-text)] mb-2">確認刪除全部記錄</h2>
            <p className="text-sm text-[var(--color-muted)] mb-1">將清除所有異動記錄，共 {entries.length} 筆</p>
            <p className="text-xs text-[var(--color-danger)] mb-6">此操作無法復原</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteAllConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-light)] bg-[var(--color-bg)] hover:bg-[var(--color-border-light)] transition-all"
              >取消</button>
              <button onClick={handleDeleteAll}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-[var(--color-danger)] hover:bg-[var(--color-danger-dark)] transition-all"
              >確認全部刪除</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
