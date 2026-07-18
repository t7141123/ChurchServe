"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

function SidebarLink({ href, active, children, onClick }: { href: string; active: boolean; children: React.ReactNode; onClick?: () => void }) {
  return (
    <a
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-[var(--color-primary)]/10 text-[var(--color-primary-dark)]"
          : "text-[var(--color-text-light)] hover:bg-[var(--color-border-light)] hover:text-[var(--color-text)]"
      }`}
    >
      {active && <span className="w-1 h-4 rounded-full bg-[var(--color-primary)] flex-shrink-0" />}
      <span className={active ? "" : "ml-4"}>{children}</span>
    </a>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const closeSidebar = () => setSidebarOpen(false);

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

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(145deg, #FDF8F3 0%, #F8F0E8 50%, #F5EDE3 100%)" }}>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 glass border-b border-[var(--color-glass-border)]">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="開啟選單"
            className="p-2 rounded-xl hover:bg-[var(--color-border-light)] transition-colors"
          >
            <svg className="w-5 h-5 text-[var(--color-text)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <a href="/admin" className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center text-xs font-bold">
              CS
            </span>
            <span className="font-bold font-serif text-[var(--color-primary)] text-base">
              管理後台
            </span>
          </a>
          <div className="w-9" />
        </div>
      </div>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky md:top-0 md:h-screen z-50 w-56 flex-shrink-0 glass border-r border-[var(--color-glass-border)] transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full p-4">
          {/* Logo */}
          <a
            href="/admin"
            onClick={closeSidebar}
            className="flex items-center gap-2.5 px-2 py-3 mb-6 rounded-xl hover:bg-[var(--color-border-light)] transition-colors"
          >
            <span className="w-8 h-8 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-bold">
              CS
            </span>
            <span className="font-bold font-serif text-[var(--color-primary)] text-base">
              管理後台
            </span>
          </a>

          {/* Nav links */}
          <nav className="flex flex-col gap-1 flex-1">
            <SidebarLink href="/admin/groups" active={isGroups} onClick={closeSidebar}>
              小組管理
            </SidebarLink>
            <SidebarLink href="/admin/schedule" active={isSchedule} onClick={closeSidebar}>
              排班管理
            </SidebarLink>
          </nav>

          {/* Bottom actions */}
          <div className="flex flex-col gap-1 pt-4 border-t border-[var(--color-border)]">
            <a
              href="/"
              onClick={closeSidebar}
              aria-label="返回首頁"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-border-light)] transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <path d="M9 22V12h6v10" />
              </svg>
              返回首頁
            </a>
            <button
              onClick={() => {
                localStorage.removeItem("admin_token");
                router.push("/admin/login");
              }}
              aria-label="登出"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger)]/5 transition-all text-left"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              登出
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="md:ml-56 min-h-[calc(100vh-3.5rem)] md:min-h-screen page-enter">
        <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
      </main>
    </div>
  );
}
