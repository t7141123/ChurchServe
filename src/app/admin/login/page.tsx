"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "登入失敗");
        setLoading(false);
        return;
      }

      localStorage.setItem("admin_token", data.data.token);

      if (data.data.mustChangePassword) {
        setMustChangePassword(true);
        setLoading(false);
        return;
      }

      router.push("/admin");
    } catch {
      setError("網路錯誤，請稍後再試");
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/auth/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "修改失敗");
        setLoading(false);
        return;
      }

      router.push("/admin");
    } catch {
      setError("網路錯誤");
      setLoading(false);
    }
  };

  if (mustChangePassword) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[var(--color-primary)]">🕊️ ChurchServe</h1>
            <p className="text-[var(--color-muted)] mt-2">首次登入，請修改預設密碼</p>
          </div>
          <form onSubmit={handleChangePassword} className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-[var(--color-border)]">
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-[var(--color-danger)] bg-opacity-10 text-[var(--color-danger)] text-sm">
                {error}
              </div>
            )}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">新密碼</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="至少 6 個字元"
                minLength={6}
                className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || newPassword.length < 6}
              className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white font-medium disabled:opacity-50"
            >
              {loading ? "處理中..." : "確認修改"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-primary)]">🕊️ ChurchServe</h1>
          <p className="text-[var(--color-muted)] mt-2">管理後台登入</p>
        </div>
        <form onSubmit={handleLogin} className="bg-[var(--color-surface)] rounded-2xl p-6 shadow-sm border border-[var(--color-border)]">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-[var(--color-danger)] bg-opacity-10 text-[var(--color-danger)] text-sm">
              {error}
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">帳號</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              autoFocus
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="請輸入密碼"
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white font-medium disabled:opacity-50"
          >
            {loading ? "登入中..." : "登入"}
          </button>
        </form>
        <p className="text-center text-sm text-[var(--color-muted)] mt-4">
          <a href="/" className="hover:text-[var(--color-primary)]">← 返回首頁</a>
        </p>
      </div>
    </div>
  );
}
