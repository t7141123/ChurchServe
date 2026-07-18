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

  useEffect(() => { fetchMembers(); }, [groupId]);

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

  const activeMembers = members.filter((m) => m.is_active === 1);
  const inactiveMembers = members.filter((m) => m.is_active === 0);

  return (
    <>
      <div className="mb-8 animate-fadeIn">
        <div className="flex items-center gap-3 mb-1">
          <a
            href="/admin/groups"
            className="w-8 h-8 rounded-xl bg-[var(--color-border-light)] flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </a>
          <div>
            <h1 className="text-2xl font-bold font-serif text-[var(--color-primary-dark)]">成員管理</h1>
            <p className="text-sm text-[var(--color-muted)]">
              {activeMembers.length} 位啟用 · {inactiveMembers.length} 位停用
            </p>
          </div>
        </div>
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="glass rounded-2xl p-5 mb-6 animate-slideUp">
        <label className="block text-sm font-medium text-[var(--color-text)] mb-2">新增成員</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="輸入成員姓名..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--color-glass-border)] bg-white/60 text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
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
                <div className="h-5 w-5 rounded-full bg-[var(--color-border-light)] animate-pulse" />
                <div className="h-5 w-28 rounded bg-[var(--color-border-light)] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-16 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-border-light)] mb-4">
            <svg className="w-8 h-8 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <p className="text-sm text-[var(--color-muted)]">尚無成員</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {members.map((member, idx) => (
            <div
              key={member.id}
              className={`glass rounded-2xl p-4 flex items-center gap-3 transition-all duration-200 hover:shadow-elevated animate-slideUp ${
                !member.is_active ? "opacity-50" : ""
              }`}
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              {editingId === member.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-[var(--color-glass-border)] bg-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                    autoFocus
                  />
                  <button
                    onClick={() => handleUpdate(member.id)}
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
                  <div
                    className={`w-5 h-5 rounded-full flex-shrink-0 ${
                      member.is_active ? "bg-[var(--color-secondary)]" : "bg-[var(--color-border)]"
                    }`}
                  />
                  <span className={`flex-1 font-medium ${!member.is_active ? "text-[var(--color-muted)] line-through" : "text-[var(--color-text)]"}`}>
                    {member.name}
                  </span>
                  <button
                    onClick={() => handleToggleActive(member)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      member.is_active
                        ? "text-[var(--color-secondary-dark)] bg-[var(--color-secondary)]/10 hover:bg-[var(--color-secondary)]/20"
                        : "text-[var(--color-muted)] bg-[var(--color-border-light)] hover:bg-[var(--color-border)]"
                    }`}
                  >
                    {member.is_active ? "啟用" : "停用"}
                  </button>
                  <button
                    onClick={() => { setEditingId(member.id); setEditName(member.name); }}
                    className="px-3 py-1.5 rounded-xl text-xs border border-[var(--color-glass-border)] transition-all hover:bg-[var(--color-border-light)]"
                  >
                    編輯
                  </button>
                  <button
                    onClick={() => handleDelete(member)}
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
