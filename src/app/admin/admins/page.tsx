"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import type { ManagedAdmin, District } from "@/types";

function decodeJwt(): { role: string; username: string } | null {
  try {
    const token = localStorage.getItem("admin_token");
    if (!token) return null;
    return JSON.parse(atob(token.split(".")[1]));
  } catch { return null; }
}

const ROLE_LABELS: Record<string, string> = {
  group_leader: "小組長",
  district_leader: "區長",
  super_admin: "超級管理員",
};

const ROLE_STYLES: Record<string, string> = {
  group_leader: "bg-blue-100 text-blue-800",
  district_leader: "bg-purple-100 text-purple-800",
  super_admin: "bg-amber-100 text-amber-800",
};

export default function AdminsPage() {
  const [admins, setAdmins] = useState<ManagedAdmin[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [groups, setGroups] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const me = decodeJwt();

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState("group_leader");
  const [addManagedId, setAddManagedId] = useState("");

  // Edit modal
  const [editing, setEditing] = useState<ManagedAdmin | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState("group_leader");
  const [editManagedId, setEditManagedId] = useState("");

  // Delete modal
  const [deleting, setDeleting] = useState<ManagedAdmin | null>(null);

  useEffect(() => {
    if (errorMsg) { const t = setTimeout(() => setErrorMsg(""), 3000); return () => clearTimeout(t); }
  }, [errorMsg]);

  const authHeaders = (): Record<string, string> => {
    const t = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    return t ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` } : { "Content-Type": "application/json" };
  };

  const loadMeta = useCallback(async () => {
    const [dRes, gRes] = await Promise.all([
      fetch("/api/districts"),
      fetch("/api/admin/groups", { headers: authHeaders() }),
    ]);
    if (dRes.ok) setDistricts(await dRes.json());
    if (gRes.ok) setGroups(await gRes.json());
  }, []);

  const refetch = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/admins", { headers: authHeaders() }).then((r) => { if (!r.ok) throw new Error(); return r.json(); }),
      loadMeta(),
    ]).then(([a]) => setAdmins(a))
      .catch(() => setErrorMsg("載入失敗"))
      .finally(() => setLoading(false));
  }, [loadMeta]);

  useEffect(() => { startTransition(() => { refetch(); }); }, [refetch]);

  const managedLabel = (a: ManagedAdmin): string => {
    if (a.role === "district_leader" && a.managed_group_id) {
      const d = districts.find((x) => x.id === a.managed_group_id);
      return d ? `分區：${d.name}` : `分區 #${a.managed_group_id}`;
    }
    if (a.role === "group_leader" && a.managed_group_id) {
      const g = groups.find((x) => x.id === a.managed_group_id);
      return g ? `小組：${g.name}` : `小組 #${a.managed_group_id}`;
    }
    return "—";
  };

  const handleCreate = async () => {
    if (!addUsername.trim() || !addPassword.trim()) { setErrorMsg("帳號與密碼為必填"); return; }
    if (addPassword.length < 6) { setErrorMsg("密碼至少 6 碼"); return; }
    try {
      const body: Record<string, unknown> = {
        username: addUsername.trim(),
        password: addPassword,
        role: addRole,
        managed_group_id: addRole === "super_admin" ? null : (addManagedId ? Number(addManagedId) : null),
      };
      const res = await fetch("/api/admin/admins", { method: "POST", headers: authHeaders(), body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "新增失敗"); }
      setShowAdd(false);
      setAddUsername(""); setAddPassword(""); setAddRole("group_leader"); setAddManagedId("");
      refetch();
    } catch (e) { setErrorMsg(e instanceof Error ? e.message : "新增失敗"); }
  };

  const openEdit = (a: ManagedAdmin) => {
    setEditing(a);
    setEditUsername(a.username);
    setEditPassword("");
    setEditRole(a.role);
    setEditManagedId(a.managed_group_id?.toString() ?? "");
  };

  const handleUpdate = async () => {
    if (!editing) return;
    if (!editUsername.trim()) { setErrorMsg("帳號不可為空"); return; }
    if (editPassword.length > 0 && editPassword.length < 6) { setErrorMsg("密碼至少 6 碼"); return; }
    try {
      const body: Record<string, unknown> = { username: editUsername.trim(), role: editRole };
      if (editPassword) body.password = editPassword;
      body.managed_group_id = editRole === "super_admin" ? null : (editManagedId ? Number(editManagedId) : null);
      const res = await fetch(`/api/admin/admins/${editing.id}`, { method: "PUT", headers: authHeaders(), body: JSON.stringify(body) });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "更新失敗"); }
      setEditing(null);
      refetch();
    } catch (e) { setErrorMsg(e instanceof Error ? e.message : "更新失敗"); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/admin/admins/${deleting.id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "刪除失敗"); }
      setDeleting(null);
      refetch();
    } catch (e) { setErrorMsg(e instanceof Error ? e.message : "刪除失敗"); }
  };

  const isSuperAdmin = me?.role === "super_admin";

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--color-muted)]">無權限存取此頁面</p>
      </div>
    );
  }

  const roleSelect = (value: string, onChange: (v: string) => void, username?: string) => {
    const isAdminAcct = username === "admin";
    return (
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">角色</label>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
          <option value="group_leader">小組長</option>
          <option value="district_leader">區長</option>
          {isAdminAcct && <option value="super_admin">超級管理員</option>}
        </select>
        {!isAdminAcct && value === "super_admin" && (
          <p className="text-xs text-amber-600 mt-1.5">僅 admin 帳號可設為超級管理員</p>
        )}
      </div>
    );
  };

  const managedIdSelector = (value: string, onChange: (v: string) => void, role: string) => {
    if (role === "super_admin") return null;

    if (role === "district_leader") {
      return (
        <div>
          <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">管理分區</label>
          <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
            <option value="">請選擇分區</option>
            {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      );
    }

    return (
      <div>
        <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">管理小組</label>
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]">
          <option value="">請選擇小組</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
    );
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-serif text-[var(--color-text)]">後台帳號管理</h1>
        <button onClick={() => setShowAdd(true)} className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:brightness-110 transition-all shadow-sm">新增帳號</button>
      </div>

      {errorMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{errorMsg}</div>
      )}

      <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                <th className="text-left px-5 py-3.5 font-semibold text-[var(--color-text)]">帳號</th>
                <th className="text-left px-5 py-3.5 font-semibold text-[var(--color-text)]">角色</th>
                <th className="text-left px-5 py-3.5 font-semibold text-[var(--color-text)]">管理範圍</th>
                <th className="text-left px-5 py-3.5 font-semibold text-[var(--color-text)]">建立時間</th>
                <th className="text-right px-5 py-3.5 font-semibold text-[var(--color-text)]">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-[var(--color-muted)]">載入中…</td></tr>
              ) : admins.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-[var(--color-muted)]">尚無管理帳號</td></tr>
              ) : admins.map((a) => (
                <tr key={a.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg)] transition-colors">
                  <td className="px-5 py-3.5 font-medium text-[var(--color-text)]">{a.username}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${ROLE_STYLES[a.role] || "bg-gray-100 text-gray-800"}`}>
                      {ROLE_LABELS[a.role] || a.role}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[var(--color-text-light)] text-xs">{managedLabel(a)}</td>
                  <td className="px-5 py-3.5 text-[var(--color-muted)] text-xs">{a.created_at}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button onClick={() => openEdit(a)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] transition-colors">編輯</button>
                    <button onClick={() => setDeleting(a)} className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors ml-1">刪除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm animate-fade-in" onClick={() => setShowAdd(false)} />
          <div className="relative w-full sm:max-w-md bg-[var(--color-surface)] rounded-t-3xl sm:rounded-2xl shadow-[var(--shadow-modal)] animate-slide-up overflow-hidden">
            <div className="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto mt-3 sm:hidden" />
            <div className="flex items-center justify-between px-6 pt-4 pb-3">
              <h3 className="text-lg font-bold font-serif text-[var(--color-text)]">新增帳號</h3>
              <button onClick={() => setShowAdd(false)} aria-label="關閉" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-border-light)] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 pb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">帳號名稱</label>
                <input value={addUsername} onChange={(e) => setAddUsername(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" placeholder="輸入帳號名稱" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">密碼</label>
                <input type="password" value={addPassword} onChange={(e) => setAddPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" placeholder="至少 6 碼" />
              </div>
              {roleSelect(addRole, setAddRole)}
              {managedIdSelector(addManagedId, setAddManagedId, addRole)}
              <button onClick={handleCreate} className="w-full py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:brightness-110 transition-all shadow-sm">建立帳號</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm animate-fade-in" onClick={() => setEditing(null)} />
          <div className="relative w-full sm:max-w-md bg-[var(--color-surface)] rounded-t-3xl sm:rounded-2xl shadow-[var(--shadow-modal)] animate-slide-up overflow-hidden">
            <div className="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto mt-3 sm:hidden" />
            <div className="flex items-center justify-between px-6 pt-4 pb-3">
              <h3 className="text-lg font-bold font-serif text-[var(--color-text)]">編輯帳號</h3>
              <button onClick={() => setEditing(null)} aria-label="關閉" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-border-light)] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 pb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">帳號名稱</label>
                <input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">新密碼（留空則不變）</label>
                <input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-sm text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" placeholder="至少 6 碼" />
              </div>
              {roleSelect(editRole, setEditRole, editing.username)}
              {managedIdSelector(editManagedId, setEditManagedId, editRole)}
              <button onClick={handleUpdate} className="w-full py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:brightness-110 transition-all shadow-sm">儲存變更</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm animate-fade-in" onClick={() => setDeleting(null)} />
          <div className="relative bg-[var(--color-surface)] rounded-2xl shadow-2xl border border-[var(--color-border)] w-full max-w-sm animate-fadeIn overflow-hidden">
            <div className="pt-8 pb-6 px-7 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 text-[#DC2626] mb-4">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                  <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                </svg>
              </div>
              <h2 className="text-lg font-bold font-serif text-[var(--color-text)] mb-2">確認刪除</h2>
              <p className="text-sm text-[var(--color-muted)]">確定要刪除帳號 <strong className="text-[var(--color-text)]">{deleting.username}</strong> 嗎？此操作無法復原。</p>
            </div>
            <div className="flex gap-3 px-7 pb-7">
              <button onClick={() => setDeleting(null)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-light)] bg-[var(--color-bg)] hover:bg-[var(--color-border-light)] transition-all">取消</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-all">確認刪除</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
