"use client";

import { useState, useEffect, startTransition } from "react";

interface Group {
  id: number;
  name: string;
  created_at: string;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(""), 3000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  const authHeaders = (): Record<string, string> => {
    const t = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    return t ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` } : { "Content-Type": "application/json" };
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/groups");
      if (!res.ok) throw new Error("載入失敗");
      const d = await res.json();
      setGroups(d);
    } catch {
      setErrorMsg("載入小組列表失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { startTransition(() => { fetchGroups(); }); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "建立失敗");
      }
      setNewName("");
      fetchGroups();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "建立失敗");
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/groups/${id}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "更新失敗");
      }
      setEditingId(null);
      fetchGroups();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "更新失敗");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`確定要刪除「${name}」嗎？此操作不可復原。`)) return;
    try {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "刪除失敗");
      }
      fetchGroups();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  return (
    <>
      <div className="mb-8 animate-fadeIn">
        <h1 className="text-2xl font-bold font-serif text-[var(--color-primary-dark)] mb-1">小組管理</h1>
        <p className="text-sm text-[var(--color-muted)]">建立、編輯或刪除小組</p>
      </div>

      {errorMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20 animate-fadeIn" role="alert">
          {errorMsg}
        </div>
      )}

      {/* Create form */}
      <form onSubmit={handleCreate} className="glass rounded-2xl p-5 mb-6 animate-slideUp">
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">新增小組</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="輸入小組名稱..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] shadow-md shadow-[var(--color-primary)]/20 transition-all duration-200 hover:shadow-lg hover:translate-y-[-1px] active:translate-y-[0px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md disabled:hover:translate-y-0"
          >
            新增
          </button>
        </div>
      </form>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl p-5" style={{ background: "var(--color-surface)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-[var(--color-border-light)] animate-pulse" />
                <div className="h-5 w-32 rounded bg-[var(--color-border-light)] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-border-light)] mb-4">
            <svg className="w-8 h-8 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <p className="text-sm text-[var(--color-muted)]">尚無小組</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group, idx) => (
            <div
              key={group.id}
              className="glass rounded-2xl p-4 flex items-center gap-3 transition-all duration-200 hover:shadow-elevated animate-slideUp"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              {editingId === group.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    autoFocus
                  />
                  <button
                    onClick={() => handleUpdate(group.id)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-secondary-dark)] shadow-sm transition-all hover:shadow-md"
                  >
                    儲存
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 rounded-xl text-sm border border-[var(--color-glass-border)] transition-all hover:bg-[var(--color-border-light)]"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white flex items-center justify-center text-xs font-bold shadow-sm shadow-[var(--color-primary)]/20 flex-shrink-0">
                    {group.name.charAt(0)}
                  </div>
                  <span className="flex-1 font-medium text-[var(--color-text)]">{group.name}</span>
                  <button
                    onClick={() => { setEditingId(group.id); setEditName(group.name); }}
                    className="px-4 py-2 rounded-xl text-sm border border-[var(--color-glass-border)] transition-all hover:bg-[var(--color-border-light)] hover:shadow-sm"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(group.id, group.name)}
                    className="px-4 py-2 rounded-xl text-sm text-[var(--color-danger)] border border-[var(--color-danger)]/20 transition-all hover:bg-[var(--color-danger)]/5 hover:shadow-sm"
                  >
                    刪除
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
