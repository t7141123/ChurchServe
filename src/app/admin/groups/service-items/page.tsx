"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import { useSearchParams } from "next/navigation";
import type { ServiceItem } from "@/types";

export default function ServiceItemsPage() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get("id");
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
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
    fetch(`/api/groups/${groupId}/service-items`, { headers: authHeaders() })
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
        body: JSON.stringify({ name: newName.trim(), category: newCategory.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "建立失敗");
      }
      setNewName("");
      setNewCategory("");
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
        body: JSON.stringify({ itemId: id, name: editName.trim(), category: editCategory.trim() }),
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

  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const reordered = [...items];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    setItems(reordered);
    setDragIdx(idx);
  };

  const handleDragEnd = async () => {
    setDragIdx(null);
    const updates = items.map((item, idx) =>
      fetch(`/api/groups/${groupId}/service-items`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ itemId: item.id, display_order: (idx + 1) * 10 }),
      })
    );
    try {
      const results = await Promise.all(updates);
      if (results.some((r) => !r.ok)) throw new Error("排序失敗");
      refetch();
    } catch {
      setErrorMsg("排序失敗");
      refetch();
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
        <div className="flex gap-2 mb-2">
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
        <input
          type="text"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          placeholder="分類（選填，例如：敬拜讚美(遇見神)）"
          className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
        />
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
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className={`glass rounded-2xl p-4 flex items-center gap-3 transition-all duration-200 animate-slideUp ${
                dragIdx === idx ? "opacity-50 scale-95" : ""
              } hover:shadow-elevated cursor-grab active:cursor-grabbing`}
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <span className="flex-shrink-0 w-6 text-center text-sm font-bold text-[var(--color-muted)] cursor-grab active:cursor-grabbing" aria-label="拖曳排序">
                <svg className="w-4 h-4 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="9" cy="5" r="1.5" fill="currentColor" />
                  <circle cx="15" cy="5" r="1.5" fill="currentColor" />
                  <circle cx="9" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="15" cy="12" r="1.5" fill="currentColor" />
                  <circle cx="9" cy="19" r="1.5" fill="currentColor" />
                  <circle cx="15" cy="19" r="1.5" fill="currentColor" />
                </svg>
              </span>
              {editingId === item.id ? (
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
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
                  <input
                    type="text"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    placeholder="分類（選填）"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  />
                </div>
              ) : (
                <>
                  <span className="flex-1 font-medium text-[var(--color-text)]">{item.name}
                    {item.category && (
                      <span className="ml-2 inline-block px-2 py-0.5 rounded-md text-xs bg-[var(--color-primary-soft)] text-[var(--color-primary)] font-medium">
                        {item.category}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => { setEditingId(item.id); setEditName(item.name); setEditCategory(item.category || ""); }}
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
