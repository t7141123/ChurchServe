"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Member {
  id: number;
  name: string;
  is_active: number;
}

export default function MembersPage() {
  const params = useParams();
  const groupId = params.id as string;
  const [members, setMembers] = useState<Member[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [loading, setLoading] = useState(true);

  const authHeaders = (): Record<string, string> => {
    const t = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    return t ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` } : { "Content-Type": "application/json" };
  };

  const fetchMembers = () => {
    fetch(`/api/groups/${groupId}/members`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setMembers(d.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchMembers();
  }, [groupId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await fetch(`/api/groups/${groupId}/members`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name: newName.trim() }),
    });
    setNewName("");
    fetchMembers();
  };

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return;
    await fetch(`/api/groups/${groupId}/members`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ memberId: id, name: editName.trim() }),
    });
    setEditingId(null);
    fetchMembers();
  };

  const handleToggleActive = async (member: Member) => {
    await fetch(`/api/groups/${groupId}/members`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ memberId: member.id, is_active: member.is_active ? 0 : 1 }),
    });
    fetchMembers();
  };

  const handleDelete = async (member: Member) => {
    if (!confirm(`確定要刪除「${member.name}」嗎？`)) return;
    await fetch(`/api/groups/${groupId}/members`, {
      method: "DELETE",
      headers: authHeaders(),
      body: JSON.stringify({ memberId: member.id }),
    });
    fetchMembers();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <a href="/admin/groups" className="text-[var(--color-muted)] hover:text-[var(--color-primary)]">
          ← 返回
        </a>
        <h2 className="text-xl font-bold">成員管理</h2>
      </div>

      <form onSubmit={handleCreate} className="mb-6 flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="新增成員姓名..."
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
      ) : members.length === 0 ? (
        <div className="text-center py-8 text-[var(--color-muted)]">尚無成員</div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <div
              key={member.id}
              className={`bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4 flex items-center gap-3 ${
                !member.is_active ? "opacity-50" : ""
              }`}
            >
              {editingId === member.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    autoFocus
                  />
                  <button
                    onClick={() => handleUpdate(member.id)}
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
                  <span className="flex-1 font-medium">{member.name}</span>
                  <button
                    onClick={() => handleToggleActive(member)}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      member.is_active
                        ? "bg-[var(--color-secondary)] bg-opacity-15 text-[var(--color-secondary-dark)]"
                        : "bg-[var(--color-muted)] bg-opacity-15 text-[var(--color-muted)]"
                    }`}
                  >
                    {member.is_active ? "啟用" : "停用"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(member.id);
                      setEditName(member.name);
                    }}
                    className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(member)}
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
