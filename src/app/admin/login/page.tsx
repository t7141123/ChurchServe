"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token) router.replace("/admin");
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      localStorage.setItem("admin_token", data.token);
      router.replace("/admin");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ background: "linear-gradient(145deg, #FDF8F3 0%, #F8F0E8 50%, #F5EDE3 100%)" }}>
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[var(--color-primary)]/5 blur-3xl" style={{ opacity: mounted ? 1 : 0, transition: "opacity 1s ease" }} />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-[var(--color-accent)]/5 blur-3xl" style={{ opacity: mounted ? 1 : 0, transition: "opacity 1.2s ease" }} />
        <div className="absolute top-1/3 left-1/4 w-3 h-3 rounded-full bg-[var(--color-primary)]/10" style={{ opacity: mounted ? 1 : 0, transition: "opacity 1.5s ease" }} />
        <div className="absolute top-1/4 right-1/3 w-2 h-2 rounded-full bg-[var(--color-accent)]/15" style={{ opacity: mounted ? 1 : 0, transition: "opacity 1.7s ease" }} />
        <div className="absolute bottom-1/3 right-1/4 w-4 h-4 rounded-full bg-[var(--color-primary)]/8" style={{ opacity: mounted ? 1 : 0, transition: "opacity 1.3s ease" }} />
      </div>

      <div className="relative z-10 w-full max-w-md px-4" style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)", transition: "all 0.6s ease" }}>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white shadow-lg shadow-[var(--color-primary)]/25 mb-4">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold font-serif text-[var(--color-primary-dark)] mb-1">管理後台</h1>
          <p className="text-sm text-[var(--color-muted)]">登入以管理排班與小組資料</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 shadow-card" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)" }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">帳號</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-glass-border)] bg-white/60 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                placeholder="請輸入帳號"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">密碼</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-glass-border)] bg-white/60 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)]"
                placeholder="請輸入密碼"
                required
                disabled={loading}
              />
            </div>
            {error && (
              <div className="px-4 py-2.5 rounded-xl bg-[var(--color-danger)]/5 border border-[var(--color-danger)]/15 text-sm text-[var(--color-danger)] animate-scaleIn">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] shadow-md shadow-[var(--color-primary)]/25 transition-all duration-200 hover:shadow-lg hover:shadow-[var(--color-primary)]/30 hover:translate-y-[-1px] active:translate-y-[0px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md disabled:hover:translate-y-0"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  驗證中...
                </span>
              ) : (
                "登入"
              )}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-xs text-[var(--color-muted)]">
          ChurchServe 管理系統
        </p>
      </div>
    </div>
  );
}
