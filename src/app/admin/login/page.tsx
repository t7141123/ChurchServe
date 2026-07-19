"use client";

import { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import { Button } from "@/lib/components/ui/Button";
import { Input } from "@/lib/components/ui/Input";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => { startTransition(() => { setMounted(true); }); }, []);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token) window.location.replace("/admin");
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      if (!res.ok) throw new Error(data.error || "Login failed");
      localStorage.setItem("admin_token", data.token);
      window.location.replace("/admin");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg.includes("失敗") || msg.includes("錯誤") || msg.includes("鎖定")
        ? msg
        : "密碼錯誤。連續失敗 5 次將鎖定 15 分鐘");
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[var(--color-bg)]">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[var(--color-primary)]/8 blur-3xl"
          style={{ opacity: mounted ? 1 : 0, transition: "opacity 1s ease" }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-[var(--color-accent)]/10 blur-3xl"
          style={{ opacity: mounted ? 1 : 0, transition: "opacity 1.2s ease" }}
        />
      </div>

      <div
        className="relative z-10 w-full max-w-md px-4"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(16px)",
          transition: "all 0.5s ease",
        }}
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-primary)] text-white shadow-lg mb-4">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M12 22v-8" />
              <path d="M12 14c-4 0-7-2.5-7-6 3.5 0 7 2 7 6z" />
              <path d="M12 14c4 0 7-2.5 7-6-3.5 0-7 2-7 6z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold font-serif text-[var(--color-primary)] mb-1">
            ChurchServe 管理員登入
          </h1>
          <p className="text-sm text-[var(--color-muted)]">管理排班、成員與小組資料</p>
        </div>

        <div
          className={`bg-[var(--color-surface)] rounded-2xl p-7 sm:p-8 border border-[var(--color-border)] shadow-[var(--shadow-elevated)] ${
            shake ? "animate-shake" : ""
          }`}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="帳號"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="請輸入帳號"
              required
              disabled={loading}
              autoComplete="username"
              error={error ? " " : undefined}
              className={error ? "border-[var(--color-danger)]" : ""}
            />
            <div>
              <Input
                label="密碼"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入密碼"
                required
                disabled={loading}
                autoComplete="current-password"
                error={error || undefined}
                className={error ? "border-[var(--color-danger)]" : ""}
              />
              {!error && (
                <p className="mt-2 text-xs text-[var(--color-muted)]">
                  初次登入請使用預設帳密
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={loading}
              disabled={loading}
            >
              登入
            </Button>
          </form>
        </div>

        <p className="text-center mt-6">
          <Link href="/" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors">
            ← 返回前台服事表
          </Link>
        </p>
      </div>
    </div>
  );
}
