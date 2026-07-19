"use client";

import { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function SidebarLink({
  href,
  active,
  children,
  icon,
  onClick,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 min-h-[48px] ${
        active
          ? "bg-white/15 text-white shadow-sm"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className={`w-5 h-5 flex-shrink-0 ${active ? "text-[var(--color-accent)]" : "text-white/60"}`}>
        {icon}
      </span>
      {children}
    </Link>
  );
}

function getAuthToken(): string | null {
  try { return localStorage.getItem("admin_token"); } catch { return null; }
}

function CalendarIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function GroupsIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2z" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setMounted(true);
    });
    const t = getAuthToken();
    if (!t) {
      if (pathname !== "/admin/login") {
        window.location.replace("/admin/login");
      }
    }
  }, [pathname]);

  const closeSidebar = () => setSidebarOpen(false);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--color-bg)]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    );
  }

  const token = getAuthToken();
  if (!token) {
    return <>{children}</>;
  }

  const isDashboard = pathname === "/admin" || pathname === "/admin/";
  const isGroups = pathname.startsWith("/admin/groups");
  const isSchedule = pathname.startsWith("/admin/schedule");
  const isIcebreakers = pathname.startsWith("/admin/icebreakers");

  const nav = (
    <>
      <Link
        href="/admin"
        onClick={closeSidebar}
        className="flex items-center gap-2.5 px-2 py-3 mb-6 rounded-xl hover:bg-white/10 transition-colors"
      >
        <span className="w-9 h-9 rounded-xl bg-[var(--color-accent)] text-white flex items-center justify-center text-sm font-bold shadow-sm">
          CS
        </span>
        <div>
          <span className="block font-bold font-serif text-white text-base leading-tight">
            ChurchServe
          </span>
          <span className="block text-[11px] text-white/55">管理後台</span>
        </div>
      </Link>

      <nav className="flex flex-col gap-1 flex-1">
        <SidebarLink href="/admin" active={isDashboard} onClick={closeSidebar} icon={<DashboardIcon />}>
          儀表板
        </SidebarLink>
        <SidebarLink href="/admin/schedule" active={isSchedule} onClick={closeSidebar} icon={<CalendarIcon />}>
          服事排班控制
        </SidebarLink>
        <SidebarLink href="/admin/groups" active={isGroups} onClick={closeSidebar} icon={<GroupsIcon />}>
          小組群組管理
        </SidebarLink>
        <SidebarLink href="/admin/icebreakers" active={isIcebreakers} onClick={closeSidebar} icon={<SparkIcon />}>
          破冰遊戲
        </SidebarLink>
      </nav>

      <div className="flex flex-col gap-1 pt-4 border-t border-white/15">
        <Link
          href="/"
          onClick={closeSidebar}
          aria-label="返回首頁"
          className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm text-white/65 hover:text-white hover:bg-white/10 transition-all min-h-[48px]"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <path d="M9 22V12h6v10" />
          </svg>
          返回前台
        </Link>
        <button
          onClick={() => {
            localStorage.removeItem("admin_token");
            window.location.href = "/admin/login";
          }}
          aria-label="登出"
          className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-bold text-red-600 hover:text-red-700 hover:bg-red-500/5 transition-all text-left min-h-[48px] w-full"
          style={{ color: "#DC2626" }}
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ color: "#DC2626" }}>
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          登出
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 bg-[var(--color-header)] text-[var(--color-header-text)] shadow-[var(--shadow-header)]">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="開啟選單"
            className="p-2 rounded-xl hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <Link href="/admin" className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[var(--color-accent)] text-white flex items-center justify-center text-xs font-bold">
              CS
            </span>
            <span className="font-bold font-serif text-base">
              管理後台
            </span>
          </Link>
          <div className="w-11" />
        </div>
      </div>

      <div className="md:flex md:flex-1">
        {/* Sidebar — solid earth green brand panel */}
        <aside
          className={`fixed md:sticky md:top-0 md:h-screen z-50 w-60 flex-shrink-0 admin-sidebar border-r border-black/10 transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="flex flex-col h-full p-4">
            {nav}
          </div>
        </aside>

        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={closeSidebar}
          />
        )}

        <main className="md:flex-1 page-enter">
          <div className="max-w-6xl mx-auto px-4 pt-4 pb-8 sm:pt-5 sm:pb-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
