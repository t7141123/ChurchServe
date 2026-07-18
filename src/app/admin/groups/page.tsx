"use client";

import { useState, useEffect } from "react";

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

  const fetchGroups = () => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setGroups(d.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName("");
    fetchGroups();
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    await fetch(`/api/groups/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditingId(null);
    fetchGroups();
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`確定要刪除「${name}」嗎？此操作不可復原。`)) return;
    await fetch(`/api/groups/${id}`, { method: "DELETE" });
    fetchGroups();
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">小組管理</h2>

      <form onSubmit={handleCreate} className="mb-6 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="新小組名稱..."
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
      ) : groups.length === 0 ? (
        <div className="text-center py-8 text-[var(--color-muted)]">尚無小組</div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4 flex items-center gap-3"
            >
              {editingId === group.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    autoFocus
                  />
                  <button
                    onClick={() => handleUpdate(group.id)}
                    className="px-4 py-2 rounded-lg bg-[var(--color-secondary)] text-white text-sm"
                  >
                    儲存
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm"
                  >
                    取消
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-medium">{group.name}</span>
                  <button
                    onClick={() => {
                      setEditingId(group.id);
                      setEditName(group.name);
                    }}
                    className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm hover:bg-[var(--color-border-light)]"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(group.id, group.name)}
                    className="px-4 py-2 rounded-lg text-[var(--color-danger)] border border-[var(--color-danger)] border-opacity-30 text-sm hover:bg-[var(--color-danger)] hover:bg-opacity-10"
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
