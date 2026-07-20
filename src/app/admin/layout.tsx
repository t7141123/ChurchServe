"use client";

import { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminRole = "super_admin" | "admin" | "campus_leader" | "district_leader" | "zone_leader" | "group_leader";

function decodeToken(token: string): { role: AdminRole; username: string } | null {
  try {
    const p = JSON.parse(atob(token.split(".")[1]));
    return { role: p.role as AdminRole, username: p.username as string };
  } catch { return null; }
}

function getAuthToken(): string | null {
  try { return localStorage.getItem("admin_token"); } catch { return null; }
}

function SidebarLink({ href, active, children, icon, onClick }: {
  href: string; active: boolean; children: React.ReactNode; icon: React.ReactNode; onClick?: () => void;
}) {
  return (
    <Link href={href} onClick={onClick}
      className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
        active ? "bg-white/15 text-white shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className={`w-5 h-5 flex-shrink-0 ${active ? "text-[var(--color-accent)]" : "text-white/60"}`}>{icon}</span>
      {children}
    </Link>
  );
}

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "超級管理員",
  admin: "管理員",
  campus_leader: "分堂長",
  district_leader: "牧區長",
  zone_leader: "小區長",
  group_leader: "小組長",
};

function CalendarIcon() { return (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>); }
function GroupsIcon() { return (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>); }
function SparkIcon() { return (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><path d="M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2z" /></svg>); }
function UsersIcon() { return (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></svg>); }
function DashboardIcon() { return (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>); }
function DistrictIcon() { return (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2a10 10 0 00-7 17 10 10 0 0014 0 10 10 0 00-7-17z" /></svg>); }
function AuditIcon() { return (<svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>); }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    startTransition(() => { setMounted(true); });
    const t = getAuthToken();
    if (!t && pathname !== "/admin/login") window.location.replace("/admin/login");
  }, [pathname]);

  const closeSidebar = () => setSidebarOpen(false);

  if (!mounted) {
    return (<div className="flex items-center justify-center min-h-screen bg-[var(--color-bg)]"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent" /></div>);
  }

  const token = getAuthToken();
  if (!token) return <>{children}</>;

  const payload = decodeToken(token);
  const adminRole = payload?.role ?? "";

  const isDashboard = pathname === "/admin" || pathname === "/admin/";
  const isGroups = pathname.startsWith("/admin/groups");
  const isSchedule = pathname.startsWith("/admin/schedule");
  const isIcebreakers = pathname.startsWith("/admin/icebreakers");
  const isAdmins = pathname.startsWith("/admin/admins");
  const isDistricts = pathname.startsWith("/admin/districts");
  const isZones = pathname.startsWith("/admin/zones");
  const isCampuses = pathname.startsWith("/admin/campuses");
  const isAudit = pathname.startsWith("/admin/audit");

  const showSchedule = adminRole !== "group_leader";
  const showCampuses = adminRole === "super_admin" || adminRole === "admin";
  const showDistricts = adminRole === "super_admin" || adminRole === "admin";
  const showZones = adminRole === "super_admin" || adminRole === "admin";
  const showGroups = adminRole !== "group_leader" && adminRole !== "zone_leader";
  const showAdmins = adminRole === "super_admin";
  const showIcebreakers = true;

  const nav = (
    <>
      <Link href="/admin" onClick={closeSidebar}
        className="flex items-center gap-2.5 px-2 py-3 mb-3 rounded-xl hover:bg-white/10 transition-colors"
      >
        <span className="w-9 h-9 rounded-xl bg-[var(--color-accent)] text-white flex items-center justify-center text-sm font-bold shadow-sm">CS</span>
        <div>
          <span className="block font-bold font-serif text-white text-base leading-tight">ChurchServe</span>
          <span className="block text-[11px] text-white/55">管理後台</span>
        </div>
      </Link>

      {payload && (
        <div className="mb-4 px-3.5 py-2 rounded-xl bg-white/10">
          <div className="text-white/90 text-sm font-medium truncate">{payload.username}</div>
        </div>
      )}

      <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto min-h-0">
        <SidebarLink href="/admin" active={isDashboard} onClick={closeSidebar} icon={<DashboardIcon />}>儀表板</SidebarLink>
        {showSchedule && (
          <SidebarLink href="/admin/schedule" active={isSchedule} onClick={closeSidebar} icon={<CalendarIcon />}>服事排班控制</SidebarLink>
        )}
        {showCampuses && (
          <SidebarLink href="/admin/campuses" active={isCampuses} onClick={closeSidebar} icon={<DistrictIcon />}>分堂管理</SidebarLink>
        )}
        {showDistricts && (
          <SidebarLink href="/admin/districts" active={isDistricts} onClick={closeSidebar} icon={<DistrictIcon />}>牧區管理</SidebarLink>
        )}
        {showZones && (
          <SidebarLink href="/admin/zones" active={isZones} onClick={closeSidebar} icon={<DistrictIcon />}>小區管理</SidebarLink>
        )}
        {showGroups && (
          <SidebarLink href="/admin/groups" active={isGroups} onClick={closeSidebar} icon={<GroupsIcon />}>小組群組管理</SidebarLink>
        )}
        {showIcebreakers && (
          <SidebarLink href="/admin/icebreakers" active={isIcebreakers} onClick={closeSidebar} icon={<SparkIcon />}>破冰遊戲推薦</SidebarLink>
        )}
        <SidebarLink href="/admin/audit" active={isAudit} onClick={closeSidebar} icon={<AuditIcon />}>異動記錄</SidebarLink>
        {showAdmins && (
          <SidebarLink href="/admin/admins" active={isAdmins} onClick={closeSidebar} icon={<UsersIcon />}>後台帳號管理</SidebarLink>
        )}
      </nav>

      <div className="flex flex-col gap-1 pt-4 border-t border-white/15 mt-auto">
        <Link href="/" onClick={closeSidebar} aria-label="返回首頁"
          className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm text-white/65 hover:text-white hover:bg-white/10 transition-all"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><path d="M9 22V12h6v10" /></svg>
          返回前台
        </Link>
        <button onClick={() => setShowLogoutModal(true)} aria-label="登出"
          className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-bold text-red-600 hover:text-red-700 hover:bg-red-500/5 transition-all text-left w-full"
          style={{ color: "#DC2626" }}
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ color: "#DC2626" }}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
          登出
        </button>
      </div>
    </>
  );

  return (
    <>
    <div className="min-h-screen bg-[var(--color-bg)]">
      <div className="md:hidden sticky top-0 z-40 bg-[var(--color-header)] text-[var(--color-header-text)] shadow-[var(--shadow-header)]">
        <div className="flex items-center justify-between h-14 px-4">
          <button onClick={() => setSidebarOpen(true)} aria-label="開啟選單"
            className="p-2 rounded-xl hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[var(--color-accent)] text-white flex items-center justify-center text-xs font-bold">CS</span>
            <span className="font-bold font-serif text-base">管理後台</span>
          </div>
          {payload && (
            <span className="text-[11px] text-[var(--color-muted)] bg-[var(--color-bg-soft)] px-2 py-0.5 rounded-md whitespace-nowrap">
              {ROLE_LABELS[payload.role] ?? payload.role}
            </span>
          )}
        </div>
      </div>

      <div className="md:flex md:flex-1">
        <aside className={`fixed md:sticky md:top-0 h-screen z-50 w-60 flex-shrink-0 admin-sidebar border-r border-black/10 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}>
          <div className="flex flex-col h-full p-4">{nav}</div>
        </aside>

        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={closeSidebar} />
        )}

        <main className="md:flex-1 page-enter">
          <div className="max-w-6xl mx-auto px-4 pt-4 pb-8 sm:pt-5 sm:pb-10">{children}</div>
        </main>
      </div>
    </div>

      {showLogoutModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="logout-modal-title">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)} />
          <div className="relative bg-[var(--color-surface)] rounded-2xl shadow-2xl border border-[var(--color-border)] w-full max-w-sm animate-fadeIn overflow-hidden">
            <div className="pt-8 pb-6 px-7 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 text-[#DC2626] mb-4">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
              </div>
              <h2 id="logout-modal-title" className="text-lg font-bold font-serif text-[var(--color-text)] mb-2">確認登出</h2>
              <p className="text-sm text-[var(--color-muted)]">您確定要登出管理後台嗎？</p>
            </div>
            <div className="flex gap-3 px-7 pb-7">
              <button onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-light)] bg-[var(--color-bg)] hover:bg-[var(--color-border-light)] transition-all"
              >取消</button>
              <button onClick={() => { setShowLogoutModal(false); localStorage.removeItem("admin_token"); window.location.href = "/admin/login"; }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-all"
              >確認登出</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
