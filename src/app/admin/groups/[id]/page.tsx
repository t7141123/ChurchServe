"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Group {
  id: number;
  name: string;
}

export default function GroupEditPage() {
  const params = useParams();
  const groupId = params.id as string;
  const [group, setGroup] = useState<Group | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/groups/${groupId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setGroup(d.data);
          setName(d.data.name);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [groupId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await fetch(`/api/groups/${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    window.location.href = "/admin/groups";
  };

  if (loading) return <div className="text-center py-8 text-[var(--color-muted)]">載入中...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <a href="/admin/groups" className="text-[var(--color-muted)] hover:text-[var(--color-primary)]">
          ← 返回
        </a>
        <h2 className="text-xl font-bold">編輯小組</h2>
      </div>

      <form onSubmit={handleUpdate} className="max-w-md">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">小組名稱</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>
        <button
          type="submit"
          disabled={!name.trim()}
          className="px-6 py-3 rounded-xl bg-[var(--color-primary)] text-white font-medium disabled:opacity-50"
        >
          儲存
        </button>
      </form>
    </div>
  );
}
