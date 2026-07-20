"use client";

import { useState, useEffect, startTransition } from "react";
import type { District, Zone, Campus } from "@/types";
import Select from "@/components/Select";

function authHeaders(): Record<string, string> {
  const t = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export default function DistrictsPage() {
  const [districts, setDistricts] = useState<(District & { zones: Zone[] })[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [newName, setNewName] = useState("");
  const [newCampusId, setNewCampusId] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCampusId, setEditCampusId] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    if (errorMsg) { const t = setTimeout(() => setErrorMsg(""), 3000); return () => clearTimeout(t); }
  }, [errorMsg]);

  const load = async () => {
    setLoading(true);
    try {
      const [dRes, zRes, cRes] = await Promise.all([
        fetch("/api/districts"),
        fetch("/api/zones"),
        fetch("/api/campuses"),
      ]);
      if (!dRes.ok) throw new Error("載入失敗");
      const districtsData: District[] = await dRes.json();
      const zonesData: Zone[] = zRes.ok ? await zRes.json() : [];
      const campusesData: Campus[] = cRes.ok ? await cRes.json() : [];
      setCampuses(campusesData);
      setDistricts(districtsData.map(d => ({
        ...d,
        zones: zonesData.filter(z => z.district_id === d.id),
      })));
    } catch {
      setErrorMsg("載入牧區資料失敗");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { startTransition(() => { load(); }); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/districts", {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name: newName.trim(), campus_id: newCampusId ? Number(newCampusId) : null }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "新增失敗"); }
      setNewName("");
      setNewCampusId("");
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "新增失敗");
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/districts/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name: editName.trim(), campus_id: editCampusId ? Number(editCampusId) : null }),
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
      const res = await fetch(`/api/districts/${id}`, {
        method: "DELETE", headers: authHeaders(),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "刪除失敗"); }
      setDeleteConfirm(null);
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  const campusName = (id: number | null) => {
    if (!id) return "";
    return campuses.find(c => c.id === id)?.name ?? "";
  };

  return (
    <>
      <div className="mb-8 animate-fadeIn">
        <h1 className="text-2xl font-bold font-serif text-[var(--color-primary-dark)] mb-1">牧區管理</h1>
        <p className="text-sm text-[var(--color-muted)]">管理牧區及其所屬小區</p>
      </div>

      {errorMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20 animate-fadeIn" role="alert">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleCreate} className="glass rounded-2xl p-5 mb-6 animate-fadeIn">
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">新增牧區</label>
        <div className="flex gap-2 mb-3">
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="輸入牧區名稱..." maxLength={50}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
          />
          <button type="submit" disabled={!newName.trim()}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] disabled:opacity-40 transition-all"
          >新增</button>
        </div>
        <Select value={newCampusId} onChange={setNewCampusId} placeholder="不選分堂"
          options={campuses.map(c => ({ value: String(c.id), label: c.name }))}
        />
      </form>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl p-5 bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse">
              <div className="h-5 w-32 rounded bg-[var(--color-border-light)]" />
            </div>
          ))}
        </div>
      ) : districts.length === 0 ? (
        <div className="text-center py-16 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-border-light)] mb-4">
            <svg className="w-8 h-8 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <circle cx="12" cy="12" r="3" /><path d="M12 2a10 10 0 00-7 17 10 10 0 0014 0 10 10 0 00-7-17z" />
            </svg>
          </div>
          <p className="text-sm text-[var(--color-muted)]">尚無任何牧區，請先新增</p>
        </div>
      ) : (
        <div className="space-y-3">
          {districts.map((d, idx) => (
            <div key={d.id} className="glass rounded-2xl p-5 transition-all duration-200 animate-fadeIn" style={{ animationDelay: `${idx * 40}ms` }}>
              {editingId === d.id ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                      maxLength={50} autoFocus
                      className="flex-1 px-3 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                      onKeyDown={e => { if (e.key === "Enter") handleUpdate(d.id); if (e.key === "Escape") setEditingId(null); }}
                    />
                    <button onClick={() => handleUpdate(d.id)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] transition-all"
                    >儲存</button>
                    <button onClick={() => setEditingId(null)}
                      className="px-3 py-2 rounded-xl text-xs font-medium text-[var(--color-text-light)] hover:bg-[var(--color-border-light)] transition-all"
                    >取消</button>
                  </div>
                  <Select value={editCampusId} onChange={setEditCampusId} placeholder="不選分堂"
                    options={campuses.map(c => ({ value: String(c.id), label: c.name }))}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-[var(--color-text)]">{d.name}</span>
                      <span className="text-xs text-[var(--color-muted)] bg-[var(--color-bg-soft)] px-2 py-0.5 rounded-md">
                        {d.zones.length} 個小區
                      </span>
                      {campusName(d.campus_id) && (
                        <span className="text-xs text-[var(--color-primary)] bg-[var(--color-primary-soft)] px-2 py-0.5 rounded-md">
                          {campusName(d.campus_id)}
                        </span>
                      )}
                    </div>
                    {d.zones.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {d.zones.map(z => (
                          <span key={z.id} className="text-[11px] text-[var(--color-primary)] bg-[var(--color-primary-soft)] px-2 py-0.5 rounded-md">
                            {z.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 ml-3">
                    <button onClick={() => { setEditingId(d.id); setEditName(d.name); setEditCampusId(d.campus_id?.toString() ?? ""); }} aria-label="編輯牧區"
                      className="p-2 rounded-xl text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-all"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                    <button onClick={() => setDeleteConfirm(d.id)} aria-label="刪除牧區"
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
            <h2 className="text-lg font-bold font-serif text-[var(--color-text)] mb-2">確認刪除牧區</h2>
            <p className="text-sm text-[var(--color-muted)] mb-1">刪除後所屬小區會變為未分類</p>
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
