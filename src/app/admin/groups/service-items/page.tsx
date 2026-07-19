"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import { useSearchParams } from "next/navigation";

interface ServiceItem {
  id: number;
  name: string;
  display_order: number;
}

export default function ServiceItemsPage() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get("id");
  const [items, setItems] = useState<ServiceItem[]>([]);
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

  const refetch = useCallback(() => {
    fetch(`/api/groups/${groupId}/service-items`)
      .then((res) => { if (!res.ok) throw new Error("載入失敗"); return res.json(); })
      .then((d) => setItems(d))
      .catch(() => setErrorMsg("載入服事項目失敗"))
      .finally(() => setLoading(false));
  }, [groupId]);

  useEffect(() => { startTransition(() => { refetch(); }); }, [refetch]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/service-items`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "建立失敗");
      }
      setNewName("");
      refetch();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "建立失敗");
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/service-items`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ itemId: id, name: editName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "更新失敗");
      }
      setEditingId(null);
      refetch();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "更新失敗");
    }
  };

  const handleMoveUp = async (item: ServiceItem) => {
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx <= 0) return;
    const prev = items[idx - 1];
    try {
      const results = await Promise.all([
        fetch(`/api/groups/${groupId}/service-items`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ itemId: item.id, display_order: prev.display_order }),
        }),
        fetch(`/api/groups/${groupId}/service-items`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ itemId: prev.id, display_order: item.display_order }),
        }),
      ]);
      if (results.some((r) => !r.ok)) throw new Error("排序失敗");
      refetch();
    } catch {
      setErrorMsg("排序失敗");
    }
  };

  const handleMoveDown = async (item: ServiceItem) => {
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= items.length - 1) return;
    const next = items[idx + 1];
    try {
      const results = await Promise.all([
        fetch(`/api/groups/${groupId}/service-items`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ itemId: item.id, display_order: next.display_order }),
        }),
        fetch(`/api/groups/${groupId}/service-items`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify({ itemId: next.id, display_order: item.display_order }),
        }),
      ]);
      if (results.some((r) => !r.ok)) throw new Error("排序失敗");
      refetch();
    } catch {
      setErrorMsg("排序失敗");
    }
  };

  const handleDelete = async (item: ServiceItem) => {
    if (!confirm(`確定要刪除「${item.name}」嗎？`)) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/service-items`, {
        method: "DELETE",
        headers: authHeaders(),
        body: JSON.stringify({ itemId: item.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "刪除失敗");
      }
      refetch();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  return (
    <>
      <div className="mb-8 animate-fadeIn">
        <div className="flex items-center gap-3 mb-1">
          <a
            href="/admin/groups"
            aria-label="返回小組列表"
            className="w-8 h-8 rounded-xl bg-[var(--color-border-light)] flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </a>
          <div>
            <h1 className="text-2xl font-bold font-serif text-[var(--color-primary-dark)]">服事項目管理</h1>
            <p className="text-sm text-[var(--color-muted)]">{items.length} 個項目</p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20 animate-fadeIn" role="alert">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleCreate} className="glass rounded-2xl p-5 mb-6 animate-slideUp">
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">新增服事項目</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="輸入項目名稱..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] shadow-md shadow-[var(--color-primary)]/20 transition-all duration-200 hover:shadow-lg hover:translate-y-[-1px] active:translate-y-[0px] disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="h-5 w-5 rounded bg-[var(--color-border-light)] animate-pulse" />
                <div className="h-5 w-32 rounded bg-[var(--color-border-light)] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-border-light)] mb-4">
            <svg className="w-8 h-8 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </div>
          <p className="text-sm text-[var(--color-muted)]">尚無服事項目</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="glass rounded-2xl p-4 flex items-center gap-3 transition-all duration-200 hover:shadow-elevated animate-slideUp"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <span className="w-6 text-center text-sm font-bold text-[var(--color-muted)]">{idx + 1}</span>
              {editingId === item.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    autoFocus
                  />
                  <button
                    onClick={() => handleUpdate(item.id)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-secondary-dark)] shadow-sm transition-all hover:shadow-md"
                  >
                    儲存
                  </button>
                </div>
              ) : (
                <>
                  <span className="flex-1 font-medium text-[var(--color-text)]">{item.name}</span>
                  <button
                    onClick={() => handleMoveUp(item)}
                    disabled={idx === 0}
                    aria-label="上移"
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm border border-[var(--color-glass-border)] transition-all hover:bg-[var(--color-border-light)] disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path d="M18 15l-6-6-6 6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleMoveDown(item)}
                    disabled={idx === items.length - 1}
                    aria-label="下移"
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-sm border border-[var(--color-glass-border)] transition-all hover:bg-[var(--color-border-light)] disabled:opacity-20 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => { setEditingId(item.id); setEditName(item.name); }}
                    className="px-3 py-1.5 rounded-xl text-xs border border-[var(--color-glass-border)] transition-all hover:bg-[var(--color-border-light)]"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="px-3 py-1.5 rounded-xl text-xs text-[var(--color-danger)] border border-[var(--color-danger)]/20 transition-all hover:bg-[var(--color-danger)]/5"
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
