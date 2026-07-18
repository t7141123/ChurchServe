"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface ServiceItem {
  id: number;
  name: string;
  display_order: number;
}

export default function ServiceItemsPage() {
  const params = useParams();
  const groupId = params.id as string;
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(true);

  const authHeaders = (): Record<string, string> => {
    const t = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    return t ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` } : { "Content-Type": "application/json" };
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    await fetch(`/api/groups/${groupId}/service-items`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ itemId: id, name: editName.trim() }),
    });
    setEditingId(null);
    fetchItems();
  };

  const fetchItems = () => {
    fetch(`/api/groups/${groupId}/service-items`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setItems(d.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchItems();
  }, [groupId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await fetch(`/api/groups/${groupId}/service-items`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName("");
    fetchItems();
  };

  const handleMoveUp = async (item: ServiceItem) => {
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx <= 0) return;
    const prev = items[idx - 1];
    await Promise.all([
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
    fetchItems();
  };

  const handleMoveDown = async (item: ServiceItem) => {
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= items.length - 1) return;
    const next = items[idx + 1];
    await Promise.all([
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
    fetchItems();
  };

  const handleDelete = async (item: ServiceItem) => {
    if (!confirm(`確定要刪除「${item.name}」嗎？`)) return;
    await fetch(`/api/groups/${groupId}/service-items`, {
      method: "DELETE",
      headers: authHeaders(),
      body: JSON.stringify({ itemId: item.id }),
    });
    fetchItems();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <a href="/admin/groups" className="text-[var(--color-muted)] hover:text-[var(--color-primary)]">
          ← 返回
        </a>
        <h2 className="text-xl font-bold">服事項目管理</h2>
      </div>

      <form onSubmit={handleCreate} className="mb-6 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="新增服事項目..."
          className="flex-1 px-4 py-3 rounded-xl border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          className="px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white font-medium disabled:opacity-50"
        >
          新增
        </button>
      </form>

      {loading ? (
        <div className="text-center py-8 text-[var(--color-muted)]">載入中...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 text-[var(--color-muted)]">尚無服事項目</div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4 flex items-center gap-3"
            >
              <span className="text-[var(--color-muted)] text-sm w-6 text-center">{idx + 1}</span>
              {editingId === item.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    autoFocus
                  />
                  <button
                    onClick={() => handleUpdate(item.id)}
                    className="px-4 py-2 rounded-lg bg-[var(--color-secondary)] text-white text-sm"
                  >
                    儲存
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-medium">{item.name}</span>
                  <button
                    onClick={() => handleMoveUp(item)}
                    disabled={idx === 0}
                    className="px-2 py-1 rounded text-sm disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMoveDown(item)}
                    disabled={idx === items.length - 1}
                    className="px-2 py-1 rounded text-sm disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(item.id);
                      setEditName(item.name);
                    }}
                    className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="px-4 py-2 rounded-lg text-[var(--color-danger)] border border-[var(--color-danger)] border-opacity-30 text-sm"
                  >
                    刪除
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
