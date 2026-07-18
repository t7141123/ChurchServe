"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className={`relative px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-[var(--color-primary)]/10 text-[var(--color-primary-dark)]"
          : "text-[var(--color-text-light)] hover:bg-[var(--color-border-light)] hover:text-[var(--color-text)]"
      }`}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[var(--color-primary)] rounded-full" />
      )}
    </a>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      if (pathname !== "/admin/login") {
        router.replace("/admin/login");
      }
      setLoading(false);
      return;
    }
    setIsAuthenticated(true);
    setLoading(false);
  }, [router, pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: "linear-gradient(145deg, #FDF8F3 0%, #F8F0E8 50%, #F5EDE3 100%)" }}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  const isGroups = pathname.startsWith("/admin/groups");
  const isSchedule = pathname.startsWith("/admin/schedule");
  const isDashboard = pathname === "/admin";

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(145deg, #FDF8F3 0%, #F8F0E8 50%, #F5EDE3 100%)" }}>
      {/* Nav */}
      <nav className="sticky top-0 z-40 glass border-b border-[var(--color-glass-border)]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-1">
              <a
                href="/admin"
                className="flex items-center gap-2.5 mr-3 px-2 py-1.5 rounded-xl hover:bg-[var(--color-border-light)] transition-colors"
              >
                <span className="w-7 h-7 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold">
                  CS
                </span>
                <span className="font-bold font-serif text-[var(--color-primary)] text-base hidden sm:inline">
                  管理後台
                </span>
              </a>
              <div className="hidden sm:flex items-center gap-1">
                <NavLink href="/admin/groups" active={isGroups}>
                  小組管理
                </NavLink>
                <NavLink href="/admin/schedule" active={isSchedule}>
                  排班管理
                </NavLink>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/"
                className="px-3 py-2 rounded-xl text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-border-light)] transition-all"
              >
                <span className="hidden sm:inline">返回首頁</span>
                <svg className="sm:hidden w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <path d="M9 22V12h6v10" />
                </svg>
              </a>
              <button
                onClick={() => {
                  localStorage.removeItem("admin_token");
                  router.push("/admin/login");
                }}
                className="px-3 py-2 rounded-xl text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger)]/5 transition-all"
              >
                <span className="hidden sm:inline">登出</span>
                <svg className="sm:hidden w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </button>
            </div>
          </div>
          {/* Mobile nav */}
          <div className="sm:hidden flex gap-1 pb-3">
            <NavLink href="/admin/groups" active={isGroups}>
              小組管理
            </NavLink>
            <NavLink href="/admin/schedule" active={isSchedule}>
              排班管理
            </NavLink>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6 page-enter">{children}</main>
    </div>
  );
}
