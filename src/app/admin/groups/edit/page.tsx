"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function GroupEditPage() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get("id");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(""), 3000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/groups/${groupId}`);
        if (!res.ok) throw new Error("載入失敗");
        const d = await res.json();
        setName(d.name);
      } catch {
        setErrorMsg("載入小組資料失敗");
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "更新失敗");
      }
      window.location.href = "/admin/groups";
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "更新失敗");
    }
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

      {errorMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20 animate-fadeIn" role="alert">
          {errorMsg}
        </div>
      )}

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
