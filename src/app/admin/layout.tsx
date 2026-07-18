"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    setIsAuthenticated(true);
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <nav className="bg-[var(--color-surface)] border-b border-[var(--color-border)] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/admin" className="text-lg font-bold text-[var(--color-primary)]">
              🕊️ ChurchServe 後台
            </a>
            <div className="hidden sm:flex items-center gap-2">
              <a href="/admin/groups" className="px-3 py-2 rounded-lg text-sm hover:bg-[var(--color-border-light)]">
                小組管理
              </a>
              <a href="/admin/schedule" className="px-3 py-2 rounded-lg text-sm hover:bg-[var(--color-border-light)]">
                排班管理
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)]">
              返回首頁
            </a>
            <button
              onClick={() => {
                localStorage.removeItem("admin_token");
                router.push("/admin/login");
              }}
              className="text-sm text-[var(--color-danger)] hover:text-[var(--color-danger-dark)]"
            >
              登出
            </button>
          </div>
        </div>
        {/* Mobile nav */}
        <div className="sm:hidden px-4 pb-3 flex gap-2">
          <a href="/admin/groups" className="px-3 py-2 rounded-lg text-sm bg-[var(--color-border-light)]">
            小組管理
          </a>
          <a href="/admin/schedule" className="px-3 py-2 rounded-lg text-sm bg-[var(--color-border-light)]">
            排班管理
          </a>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
