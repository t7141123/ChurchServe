"use client";

import { useState, useEffect, startTransition } from "react";
import type { Campus, District } from "@/types";

function authHeaders(): Record<string, string> {
  const t = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function CampusesPage() {
  const [campuses, setCampuses] = useState<(Campus & { districts: District[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    if (errorMsg) { const t = setTimeout(() => setErrorMsg(""), 3000); return () => clearTimeout(t); }
  }, [errorMsg]);

  const load = async () => {
    setLoading(true);
    try {
      const [cRes, dRes] = await Promise.all([
        fetch("/api/campuses", { headers: authHeaders() }),
        fetch("/api/districts"),
      ]);
      if (!cRes.ok) throw new Error("載入失敗");
      const campusesData: Campus[] = await cRes.json();
      const districtsData: District[] = dRes.ok ? await dRes.json() : [];
      setCampuses(campusesData.map(c => ({
        ...c,
        districts: districtsData.filter(d => d.campus_id === c.id),
      })));
    } catch {
      setErrorMsg("載入分堂資料失敗");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { startTransition(() => { load(); }); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/campuses", {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "新增失敗"); }
      setNewName("");
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "新增失敗");
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/campuses/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "更新失敗"); }
      setEditingId(null);
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "更新失敗");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/campuses/${id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "刪除失敗"); }
      setDeleteConfirm(null);
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  return (
    <>
      <div className="mb-8 animate-fadeIn">
        <h1 className="text-2xl font-bold font-serif text-[var(--color-primary-dark)] mb-1">分堂管理</h1>
        <p className="text-sm text-[var(--color-muted)]">管理分堂及其所屬牧區</p>
      </div>

      {errorMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20 animate-fadeIn" role="alert">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleCreate} className="glass rounded-2xl p-5 mb-6 animate-fadeIn">
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">新增分堂</label>
        <div className="flex gap-2">
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="輸入分堂名稱..." maxLength={50}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
          />
          <button type="submit" disabled={!newName.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-40 transition-all"
          >新增</button>
        </div>
      </form>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl p-5 bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse">
              <div className="h-5 w-32 rounded bg-[var(--color-border-light)]" />
            </div>
          ))}
        </div>
      ) : campuses.length === 0 ? (
        <div className="text-center py-16 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-border-light)] mb-4">
            <svg className="w-8 h-8 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-sm text-[var(--color-muted)]">尚無任何分堂，請先新增</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campuses.map((c, idx) => (
            <div key={c.id} className="glass rounded-2xl p-5 transition-all duration-200 animate-fadeIn" style={{ animationDelay: `${idx * 40}ms` }}>
              {editingId === c.id ? (
                <div className="flex items-center gap-2">
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                    maxLength={50} autoFocus
                    className="flex-1 px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    onKeyDown={e => { if (e.key === "Enter") handleUpdate(c.id); if (e.key === "Escape") setEditingId(null); }}
                  />
                  <button onClick={() => handleUpdate(c.id)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] transition-all"
                  >儲存</button>
                  <button onClick={() => setEditingId(null)}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-[var(--color-text-light)] hover:bg-[var(--color-border-light)] transition-all"
                  >取消</button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-[var(--color-text)]">{c.name}</span>
                      <span className="text-xs text-[var(--color-muted)] bg-[var(--color-bg-soft)] px-2 py-0.5 rounded-md">
                        {c.districts.length} 個牧區
                      </span>
                    </div>
                    {c.districts.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {c.districts.map(d => (
                          <span key={d.id} className="text-[11px] text-[var(--color-primary)] bg-[var(--color-primary-soft)] px-2 py-0.5 rounded-md">
                            {d.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 ml-3">
                    <button onClick={() => { setEditingId(c.id); setEditName(c.name); }} aria-label="編輯分堂"
                      className="p-2 rounded-xl text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-all"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button onClick={() => setDeleteConfirm(c.id)} aria-label="刪除分堂"
                      className="p-2 rounded-xl text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition-all"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-[var(--color-surface)] rounded-2xl shadow-2xl border border-[var(--color-border)] w-full max-w-sm animate-fadeIn p-6 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-danger-soft)] text-[var(--color-danger)] mb-4">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <h2 className="text-lg font-bold font-serif text-[var(--color-text)] mb-2">確認刪除分堂</h2>
            <p className="text-sm text-[var(--color-muted)] mb-1">刪除後所屬牧區與小區會變為未分類</p>
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
    </>
  );
}
