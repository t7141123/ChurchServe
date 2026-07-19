"use client";

import { useState, useEffect, useCallback, useMemo, useRef, startTransition } from "react";
import Link from "next/link";
import { Card } from "@/lib/components/ui/Card";
import { Button } from "@/lib/components/ui/Button";
import { Select } from "@/lib/components/ui/Select";

interface Group {
  id: number;
  name: string;
}

interface ServiceItem {
  id: number;
  name: string;
  category: string;
  display_order: number;
}

interface ScheduleDate {
  date: string;
  dayOfWeek: string;
  scheduleId: number | null;
  isSpecialEvent: number;
  eventTitle: string | null;
  isLocked: number;
  lockMessage: string | null;
  remarks: string | null;
  assignments: Record<number, { member_id: number | null; custom_member_name: string | null; member_name: string | null; id: number }>;
}

interface Member {
  id: number;
  name: string;
}

interface Icebreaker {
  id: number;
  name: string;
  description: string;
  category: string;
  duration: string;
  people_min: number;
  people_max: number;
  materials: string;
  is_active: number;
  created_at?: string;
}

function getSaturdaysOfMonth(year: number, month: number): string[] {
  const dates: string[] = [];
  const date = new Date(year, month - 1, 1);
  while (date.getMonth() === month - 1) {
    if (date.getDay() === 6) {
      dates.push(
        `${year}-${String(month).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
      );
    }
    date.setDate(date.getDate() + 1);
  }
  return dates;
}

const DAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

const CHIP_CLASSES = [
  "chip-emerald",
  "chip-sky",
  "chip-violet",
  "chip-rose",
  "chip-amber",
  "chip-teal",
  "chip-indigo",
  "chip-pink",
  "chip-lime",
  "chip-cyan",
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function isCurrentWeek(dateStr: string): boolean {
  const now = new Date();
  const day = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - day);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  const target = new Date(dateStr + "T00:00:00");
  return target >= startOfWeek && target <= endOfWeek;
}

function getMemberChipClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CHIP_CLASSES[Math.abs(hash) % CHIP_CLASSES.length];
}

function SproutIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22v-8" />
      <path d="M12 14c-4 0-7-2.5-7-6 3.5 0 7 2 7 6z" />
      <path d="M12 14c4 0 7-2.5 7-6-3.5 0-7 2-7 6z" />
      <path d="M12 22c-2 0-3.5-1-3.5-1" />
    </svg>
  );
}

function SkeletonCard() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="載入中">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5 space-y-3 shadow-[var(--shadow-card)]">
          <div className="animate-shimmer h-5 w-28 rounded-lg" />
          <div className="animate-shimmer h-4 w-full rounded-lg" />
          <div className="animate-shimmer h-4 w-3/4 rounded-lg" />
          <div className="animate-shimmer h-4 w-1/2 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number>(0);
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [schedules, setSchedules] = useState<ScheduleDate[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleLoading, setScheduleLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalScheduleId, setModalScheduleId] = useState<number | null>(null);
  const [modalItemId, setModalItemId] = useState<number | null>(null);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [modalCurrentValue, setModalCurrentValue] = useState<{ member_id: number | null; custom_name: string | null } | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<number | undefined | null>(undefined);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [icebreakers, setIcebreakers] = useState<Icebreaker[]>([]);
  const [icebreakerOpen, setIcebreakerOpen] = useState(false);
  const [icebreakerLoading, setIcebreakerLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  const [remarksModalOpen, setRemarksModalOpen] = useState(false);
  const [remarksScheduleId, setRemarksScheduleId] = useState<number | null>(null);
  const [remarksText, setRemarksText] = useState("");
  const [remarksSubmitting, setRemarksSubmitting] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d) && d.length > 0) {
          setGroups(d);
          setSelectedGroup(d[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchSchedules = useCallback(async () => {
    if (!selectedGroup) return;
    setScheduleLoading(true);
    try {
      const startMonth = currentMonth % 2 === 1 ? currentMonth : currentMonth - 1;
      const ym1 = `${currentYear}-${String(startMonth).padStart(2, "0")}`;
      const ym2 = `${currentYear}-${String(startMonth + 1).padStart(2, "0")}`;

      const [schedRes1, schedRes2, itemRes, memberRes] = await Promise.all([
        fetch(`/api/schedules/${selectedGroup}/${ym1}`),
        fetch(`/api/schedules/${selectedGroup}/${ym2}`),
        fetch(`/api/groups/${selectedGroup}/service-items`),
        fetch(`/api/groups/${selectedGroup}/members`),
      ]);
      const schedData1 = await schedRes1.json();
      const schedData2 = await schedRes2.json();
      const itemData = await itemRes.json();
      const memberData = await memberRes.json();

      if (itemData.success) setServiceItems(itemData.data);
      else if (Array.isArray(itemData)) setServiceItems(itemData);

      if (memberData.success) setMembers(memberData.data.filter((m: Member & { is_active: number }) => m.is_active === 1));
      else if (Array.isArray(memberData)) setMembers(memberData.filter((m: Member & { is_active: number }) => m.is_active === 1));

      const dates1 = getSaturdaysOfMonth(currentYear, startMonth);
      const dates2 = getSaturdaysOfMonth(currentYear, startMonth + 1);
      const dates = [...dates1, ...dates2];
      const apiSchedules1 = schedData1.success ? schedData1.data : (Array.isArray(schedData1) ? schedData1 : []);
      const apiSchedules2 = schedData2.success ? schedData2.data : (Array.isArray(schedData2) ? schedData2 : []);
      const apiSchedules = [...apiSchedules1, ...apiSchedules2];

      const enriched: ScheduleDate[] = dates.map((dateStr) => {
        const existing = apiSchedules.find((s: { date: string }) => s.date === dateStr);
        const assignmentsMap: ScheduleDate["assignments"] = {};

        if (existing?.assignments) {
          for (const a of existing.assignments) {
            assignmentsMap[a.service_item_order || a.display_order || 0] = {
              member_id: a.member_id,
              custom_member_name: a.custom_member_name,
              member_name: a.member_name,
              id: a.id,
            };
          }
        }

        return {
          date: dateStr,
          dayOfWeek: DAY_NAMES[new Date(dateStr + "T00:00:00").getDay()],
          scheduleId: existing?.id || null,
          isSpecialEvent: existing?.is_special_event || 0,
          eventTitle: existing?.event_title || null,
          isLocked: existing?.is_locked || 0,
          lockMessage: existing?.lock_message || null,
          remarks: existing?.remarks || null,
          assignments: assignmentsMap,
        };
      });

      setSchedules(enriched);
    } catch (e) {
      console.error("fetchSchedules error:", e);
    } finally {
      setScheduleLoading(false);
    }
  }, [selectedGroup, currentYear, currentMonth]);

  useEffect(() => {
    startTransition(() => { fetchSchedules(); });
  }, [fetchSchedules]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handler);
      const onScroll = () => setMenuOpen(false);
      window.addEventListener("scroll", onScroll, { once: true });
      return () => {
        document.removeEventListener("mousedown", handler);
        window.removeEventListener("scroll", onScroll);
      };
    }
  }, [menuOpen]);

  const openModal = (
    scheduleId: number,
    itemId: number,
    date: string,
    currentValue: { member_id: number | null; custom_name: string | null } | null
  ) => {
    setModalScheduleId(scheduleId);
    setModalItemId(itemId);
    setModalDate(date);
    setModalCurrentValue(currentValue);
    setSelectedMemberId(currentValue?.member_id ?? undefined);
    setCustomName(currentValue?.custom_name || "");
    setShowCustomInput(Boolean(currentValue?.custom_name));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setShowCustomInput(false);
    setCustomName("");
    setSelectedMemberId(undefined);
    setSubmitting(false);
  };

  const handleConfirm = async () => {
    if (modalScheduleId === null || modalItemId === null) return;
    setSubmitting(true);

    const body: { member_id?: number | null; custom_member_name?: string | null } = {};
    if (showCustomInput && customName.trim()) {
      body.custom_member_name = customName.trim();
      body.member_id = null;
    } else if (selectedMemberId === null) {
      body.member_id = null;
      body.custom_member_name = null;
    } else if (typeof selectedMemberId === "number") {
      body.member_id = selectedMemberId;
      body.custom_member_name = null;
    } else {
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/assignments/${modalScheduleId}/${modalItemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        closeModal();
        setErrorMsg("");
        fetchSchedules();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "操作失敗");
        setTimeout(() => setErrorMsg(""), 3000);
      }
    } catch {
      setErrorMsg("網路錯誤，請稍後再試");
      setTimeout(() => setErrorMsg(""), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = async () => {
    setSelectedMemberId(null);
    setShowCustomInput(false);
    setCustomName("");
    if (modalScheduleId === null || modalItemId === null) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/assignments/${modalScheduleId}/${modalItemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: null, custom_member_name: null }),
      });
      if (res.ok) {
        closeModal();
        fetchSchedules();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "清除失敗");
        setTimeout(() => setErrorMsg(""), 3000);
      }
    } catch {
      setErrorMsg("網路錯誤，請稍後再試");
      setTimeout(() => setErrorMsg(""), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const openRemarksModal = (schedule: ScheduleDate) => {
    setRemarksScheduleId(schedule.scheduleId);
    setRemarksText(schedule.remarks || "");
    setRemarksModalOpen(true);
  };

  const closeRemarksModal = () => {
    setRemarksModalOpen(false);
    setRemarksScheduleId(null);
    setRemarksText("");
  };

  const handleSaveRemarks = async () => {
    if (remarksScheduleId === null) return;
    setRemarksSubmitting(true);
    try {
      const res = await fetch(`/api/remarks/${remarksScheduleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks: remarksText }),
      });
      if (res.ok) {
        closeRemarksModal();
        setErrorMsg("");
        fetchSchedules();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "儲存失敗");
        setTimeout(() => setErrorMsg(""), 3000);
      }
    } catch {
      setErrorMsg("網路錯誤，請稍後再試");
      setTimeout(() => setErrorMsg(""), 3000);
    } finally {
      setRemarksSubmitting(false);
    }
  };

  const canConfirm =
    (showCustomInput && customName.trim().length > 0) ||
    (typeof selectedMemberId === "number");

  const startMonth = currentMonth % 2 === 1 ? currentMonth : currentMonth - 1;
  const currentLabel = `${currentYear} 年 ${startMonth} - ${startMonth + 1} 月`;
  const selectedGroupName = groups.find((g) => g.id === selectedGroup)?.name || "選擇小組";

  const serviceItemGroups = useMemo(() => {
    const groups: { category: string | null; items: ServiceItem[] }[] = [];
    let currentCat: string | null = null;
    let currentItems: ServiceItem[] = [];
    for (const item of serviceItems) {
      const cat = item.category || null;
      if (cat !== currentCat) {
        if (currentItems.length > 0) groups.push({ category: currentCat, items: currentItems });
        currentCat = cat;
        currentItems = [];
      }
      currentItems.push(item);
    }
    if (currentItems.length > 0) groups.push({ category: currentCat, items: currentItems });
    return groups;
  }, [serviceItems]);
  const modalItemName = serviceItems.find((i) => i.id === modalItemId)?.name || "";

  const prevMonth = () => {
    const startMonth = currentMonth % 2 === 1 ? currentMonth : currentMonth - 1;
    if (startMonth === 1) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(startMonth - 2);
    }
  };
  const nextMonth = () => {
    const startMonth = currentMonth % 2 === 1 ? currentMonth : currentMonth - 1;
    if (startMonth === 11) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(startMonth + 2);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Brand header — solid earth green */}
      <header className="sticky top-0 z-40 bg-[var(--color-header)] text-[var(--color-header-text)] shadow-[var(--shadow-header)]">
        <div className="max-w-6xl mx-auto px-4">
          {/* Top row: logo + group + admin */}
          <div className="flex items-center justify-between gap-3 py-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-9 h-9 rounded-xl bg-[var(--color-primary-soft)] flex items-center justify-center flex-shrink-0">
                <SproutIcon className="w-5 h-5 text-[var(--color-primary)]" />
              </span>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold font-serif tracking-wide truncate text-[var(--color-text)]">
                  ChurchServe
                </h1>
                <p className="text-[11px] sm:text-xs text-[var(--color-header-text)]/75 leading-tight hidden sm:block">
                  小組服事表
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Select
                value={String(selectedGroup)}
                onChange={(v) => setSelectedGroup(Number(v))}
                options={
                  groups.length === 0
                    ? [{ value: "0", label: "尚無小組" }]
                    : groups.map((g) => ({ value: String(g.id), label: g.name }))
                }
                ariaLabel="選擇小組"
                className="max-w-[140px] sm:max-w-[200px]"
              />
            </div>
          </div>

          {/* Month switcher — centered primary control */}
          <div className="flex items-center justify-center gap-1 pb-3">
            <button
              onClick={prevMonth}
              aria-label="上一個月"
              className="w-11 h-11 rounded-xl hover:bg-[var(--color-border-light)] flex items-center justify-center text-[var(--color-text-light)] transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <div className="min-w-[160px] sm:min-w-[180px] text-center px-2">
              <span className="text-base sm:text-lg font-semibold tracking-wide text-[var(--color-text)]">{currentLabel}</span>
            </div>
            <button
              onClick={nextMonth}
              aria-label="下一個月"
              className="w-11 h-11 rounded-xl hover:bg-[var(--color-border-light)] flex items-center justify-center text-[var(--color-text-light)] transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

        </div>
      </header>

      {/* Floating hamburger menu */}
      <div ref={menuRef} className="fixed bottom-6 right-3 sm:right-6 z-50">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="選單"
          className="w-12 h-12 rounded-full bg-[var(--color-primary)] text-white shadow-lg flex items-center justify-center hover:opacity-90 active:scale-95 transition-all"
        >
          {menuOpen ? (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        <div
          className={`absolute right-0 bottom-full mb-3 w-48 transition-all duration-300 ease-out ${
            menuOpen
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-3 pointer-events-none"
          }`}
        >
          <div className="bg-white rounded-2xl shadow-xl border border-[var(--color-border)] overflow-hidden">
            <button
              onClick={() => {
                setMenuOpen(false);
                setIcebreakerOpen(true);
                setIcebreakerLoading(true);
                fetch("/api/icebreakers")
                  .then((r) => r.json())
                  .then((d) => { if (Array.isArray(d)) setIcebreakers(d); })
                  .finally(() => setIcebreakerLoading(false));
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-primary-soft)] transition-colors border-b border-[var(--color-border)]"
            >
              <svg className="w-5 h-5 text-[var(--color-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M12 2a4 4 0 014 4c0 1.5-.8 2.8-2 3.5V11h2v2h-2v2h2v2h-6v-2h2v-2H10v-2h2V9.5A4 4 0 0112 2z" />
                <path d="M8 21h8" />
              </svg>
              破冰遊戲推薦
            </button>
            <button
              onClick={() => { setViewMode(viewMode === "table" ? "card" : "table"); setMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-primary-soft)] transition-colors border-b border-[var(--color-border)]"
            >
              <svg className="w-5 h-5 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
              <span>顯示模式</span>
              <span className="ml-auto text-xs font-medium text-[var(--color-muted)] bg-[var(--color-bg-soft)] px-2.5 py-1 rounded-full">
                {viewMode === "table" ? "表格" : "單日"}
              </span>
            </button>
            <Link
              href="/admin/login"
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-primary-soft)] transition-colors"
            >
              <svg className="w-5 h-5 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M13 12H3" />
              </svg>
              登入後台
            </Link>
          </div>
        </div>
      </div>

      {/* Schedule content */}
      <main className="max-w-6xl mx-auto w-full px-4 py-5 sm:py-6 flex-1">
        {loading ? (
          <SkeletonCard />
        ) : groups.length === 0 ? (
          <div className="text-center py-20 page-enter">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary-soft)] flex items-center justify-center mx-auto mb-4 text-[var(--color-primary)]">
              <SproutIcon className="w-8 h-8" />
            </div>
            <p className="text-lg font-medium text-[var(--color-text)] mb-1">尚無小組資料</p>
            <p className="text-sm text-[var(--color-muted)]">請先由管理員建立小組</p>
          </div>
        ) : schedules.length === 0 && !scheduleLoading ? (
          <div className="text-center py-20 page-enter">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-border-light)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <p className="text-lg text-[var(--color-muted)]">本月尚無排班資料</p>
          </div>
        ) : (
          <div className={`space-y-4 page-enter ${scheduleLoading ? "opacity-60 pointer-events-none" : ""}`}>
            {/* Desktop table */}
            <div className={`${viewMode === "table" ? "block" : "hidden"} overflow-x-auto rounded-2xl border border-[var(--color-border)] shadow-[var(--shadow-card)] bg-[var(--color-surface)]`}>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[var(--color-table-head)]">
                    <th rowSpan={2} className="w-[1%] px-5 py-3.5 text-center font-semibold text-sm text-[var(--color-table-head-text)] whitespace-nowrap border-b border-r border-[var(--color-border)]">
                      日期
                    </th>
                    {serviceItemGroups.map((group) => {
                      if (group.category) {
                        return (
                          <th key={group.category} colSpan={group.items.length} className="px-3 py-3 text-center font-semibold text-sm text-[var(--color-table-head-text)] border-b border-r border-[var(--color-border)]">
                            {group.category}
                          </th>
                        );
                      }
                      return group.items.map((item) => (
                        <th key={item.id} rowSpan={2} className="whitespace-nowrap px-3 py-3.5 text-center font-semibold text-sm text-[var(--color-table-head-text)] border-b border-r border-[var(--color-border)]">
                          {item.name}
                        </th>
                      ));
                    })}
                    <th rowSpan={2} className="w-full px-3 py-3.5 text-center font-semibold text-sm text-[var(--color-table-head-text)] border-b border-[var(--color-border)]">備註</th>
                  </tr>
                  {serviceItemGroups.some((g) => g.category) && (
                    <tr className="bg-[var(--color-table-head)]">
                      {serviceItemGroups.map((group) => {
                        if (group.category) {
                          return group.items.map((item) => (
                            <th key={item.id} className="whitespace-nowrap px-3 py-3.5 text-center font-semibold text-sm text-[var(--color-table-head-text)] border-b border-r border-[var(--color-border)]">
                              {item.name}
                            </th>
                          ));
                        }
                        return null;
                      })}
                    </tr>
                  )}
                </thead>
                <tbody>
                  {schedules.map((schedule, idx) => {
                    const colCount = serviceItems.length + 2;
                    const isCurrent = isCurrentWeek(schedule.date);

                    if (schedule.isLocked) {
                      return (
                        <tr key={schedule.date}>
                          <td
                            className={
                              "py-4 font-semibold text-center whitespace-nowrap border-r border-[var(--color-border)] text-[var(--color-text)] align-middle" +
                              (isCurrent ? " border-l-4 border-l-[var(--color-accent)] pl-3 pr-5" : " px-5")
                            }
                          >
                            <div className="flex flex-col items-center justify-center gap-0.5 text-center">
                              <span className="text-sm">
                                {formatDate(schedule.date)}
                                <span className="text-[var(--color-muted)] text-xs font-normal ml-1.5">
                                  ({DAY_NAMES[new Date(schedule.date + "T00:00:00").getDay()]})
                                </span>
                              </span>
                              {isCurrent && (
                                <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-accent-dark)]">
                                  本週
                                </span>
                              )}
                            </div>
                          </td>
                          <td colSpan={serviceItems.length + 1} className="px-5 py-4 text-center stripe-locked">
                            <span className="inline-flex items-center gap-2 text-base text-[var(--color-muted)] font-medium">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <rect x="3" y="11" width="18" height="11" rx="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" />
                              </svg>
                              {schedule.lockMessage || "暫停聚會"}
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    if (schedule.isSpecialEvent) {
                      return (
                        <tr key={schedule.date}>
                          <td colSpan={colCount} className="px-5 py-7 text-center bg-[var(--color-special-bg)]">
                            <span className="text-[var(--color-special-text)] font-bold text-lg">
                              {schedule.eventTitle}
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr
                        key={schedule.date}
                        className={
                          (idx % 2 === 0 ? "bg-[var(--color-surface)] " : "bg-[var(--color-bg-soft)]/60 ") +
                          "transition-colors hover:bg-[var(--color-primary-soft)]/50"
                        }
                      >
                        <td
                          className={
                            "py-4 font-semibold text-center whitespace-nowrap border-r border-[var(--color-border)] text-[var(--color-text)] align-middle" +
                            (isCurrent ? " border-l-4 border-l-[var(--color-accent)] pl-3 pr-5" : " px-5")
                          }
                        >
                          <div className="flex flex-col items-center justify-center gap-0.5 text-center">
                            <span className="text-sm">
                              {formatDate(schedule.date)}
                              <span className="text-[var(--color-muted)] text-xs font-normal ml-1.5">
                                ({DAY_NAMES[new Date(schedule.date + "T00:00:00").getDay()]})
                              </span>
                            </span>
                            {isCurrent && (
                              <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-accent-dark)]">
                                本週
                              </span>
                            )}
                          </div>
                        </td>
                        {serviceItems.map((item) => {
                          const assignment = schedule.assignments[item.display_order];
                          const name = assignment?.member_name || assignment?.custom_member_name;

                          return (
                            <td
                              key={item.id}
                              role="button"
                              tabIndex={0}
                              className="px-3 py-4 text-center border-r border-[var(--color-border)] last:border-r-0 cursor-pointer hover:bg-[var(--color-accent-soft)] transition-colors"
                              onClick={() =>
                                openModal(schedule.scheduleId || 0, item.id, schedule.date, assignment ? {
                                  member_id: assignment.member_id,
                                  custom_name: assignment.custom_member_name,
                                } : null)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  openModal(schedule.scheduleId || 0, item.id, schedule.date, assignment ? {
                                    member_id: assignment.member_id,
                                    custom_name: assignment.custom_member_name,
                                  } : null);
                                }
                              }}
                            >
                              {name ? (
                                <span className={`inline-block px-2.5 py-1 rounded-lg text-sm font-medium border ${getMemberChipClass(name)}`}>
                                  {name}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[var(--color-text-light)] text-sm hover:text-[var(--color-accent)] transition-colors whitespace-nowrap">
                                  <span className="w-5 h-5 rounded-full border border-dashed border-[var(--color-border)] flex items-center justify-center text-xs">+</span>
                                  登記
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td
                          role="button"
                          tabIndex={0}
                          className="px-3 py-4 text-center text-xs cursor-pointer hover:bg-[var(--color-accent-soft)] transition-colors"
                          onClick={() => openRemarksModal(schedule)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openRemarksModal(schedule);
                            }
                          }}
                        >
                          {schedule.remarks ? (
                            <span className="text-[var(--color-muted)] whitespace-nowrap mx-auto">{schedule.remarks}</span>
                          ) : (
                            <span className="text-[var(--color-accent)] opacity-60 hover:opacity-100 transition-opacity text-sm font-medium">+ 備註</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card stream */}
            <div className={`${viewMode === "card" ? "block" : "hidden"} space-y-3`}>
              {schedules.map((schedule) => {
                const isCurrent = isCurrentWeek(schedule.date);

                if (schedule.isLocked) {
                  return (
                    <div key={schedule.date} className="rounded-2xl overflow-hidden border border-[var(--color-border)] stripe-locked">
                      <div
                        className={
                          "py-3.5 bg-[var(--color-primary-soft)] border-b border-[var(--color-border)] flex items-center justify-between" +
                          (isCurrent ? " border-l-4 border-l-[var(--color-accent)] pl-3 pr-4" : " px-4")
                        }
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--color-primary)] text-base">
                            {formatDate(schedule.date)}
                          </span>
                          <span className="text-xs text-[var(--color-muted)]">
                            ({DAY_NAMES[new Date(schedule.date + "T00:00:00").getDay()]})
                          </span>
                        </div>
                        {isCurrent && (
                          <span className="text-xs font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-[var(--color-accent)] text-white">
                            本週
                          </span>
                        )}
                      </div>
                      <div className="px-4 py-3.5 text-center">
                        <span className="inline-flex items-center gap-2 text-base text-[var(--color-muted)] font-medium">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 0110 0v4" />
                          </svg>
                          {schedule.lockMessage || "暫停聚會"}
                        </span>
                      </div>
                    </div>
                  );
                }

                if (schedule.isSpecialEvent) {
                  return (
                    <div key={schedule.date} className="rounded-2xl overflow-hidden bg-[var(--color-special-bg)] shadow-[var(--shadow-card)]">
                      <div className="px-4 py-8 text-center">
                        <span className="text-[var(--color-special-text)] font-bold text-lg">
                          {schedule.eventTitle}
                        </span>
                      </div>
                    </div>
                  );
                }

                return (
                  <Card
                    key={schedule.date}
                    variant="default"
                    padding="none"
                    className={`overflow-hidden ${isCurrent ? "ring-2 ring-[var(--color-accent)]/40" : ""}`}
                  >
                    <div
                      className={
                        "py-3.5 bg-[var(--color-primary-soft)] border-b border-[var(--color-border)] flex items-center justify-between" +
                        (isCurrent ? " border-l-4 border-l-[var(--color-accent)] pl-3 pr-4" : " px-4")
                      }
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--color-primary)] text-base">
                          {formatDate(schedule.date)}
                        </span>
                        <span className="text-xs text-[var(--color-muted)]">
                          ({DAY_NAMES[new Date(schedule.date + "T00:00:00").getDay()]})
                        </span>
                      </div>
                      {isCurrent && (
                        <span className="text-xs font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-[var(--color-accent)] text-white">
                          本週
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-[var(--color-border-light)]">
                      {serviceItems.map((item) => {
                        const assignment = schedule.assignments[item.display_order];
                        const name = assignment?.member_name || assignment?.custom_member_name;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            className="w-full px-4 py-3.5 flex items-center justify-between min-h-[52px] active:bg-[var(--color-border-light)] transition-colors text-left"
                            onClick={() => openModal(schedule.scheduleId || 0, item.id, schedule.date, assignment ? {
                              member_id: assignment.member_id,
                              custom_name: assignment.custom_member_name,
                            } : null)}
                          >
                            <span className="text-sm font-medium text-[var(--color-text-light)]">{item.name}</span>
                            {name ? (
                              <span className={`text-sm font-medium px-3 py-1 rounded-full border ${getMemberChipClass(name)}`}>
                                {name}
                              </span>
                            ) : (
                              <span className="text-sm font-medium text-[var(--color-accent)] bg-[var(--color-accent-soft)] px-3 py-1 rounded-full">
                                點擊登記
                              </span>
                            )}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        className="w-full px-4 py-3 flex items-center justify-between bg-[var(--color-bg-soft)]/50 active:bg-[var(--color-border-light)] transition-colors"
                        onClick={() => openRemarksModal(schedule)}
                      >
                        <span className="text-xs font-medium text-[var(--color-text-light)]">備註</span>
                        {schedule.remarks ? (
                          <span className="text-xs text-[var(--color-muted)] text-right max-w-[60%] truncate">{schedule.remarks}</span>
                        ) : (
                          <span className="text-xs text-[var(--color-accent)] font-medium">+ 新增</span>
                        )}
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Error toast */}
      {errorMsg && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl bg-[var(--color-danger)] text-white text-sm shadow-lg animate-slide-up max-w-[90vw]" role="alert">
          {errorMsg}
        </div>
      )}

      {/* Assignment modal — button grid + confirm */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm animate-fade-in" onClick={closeModal} />
          <div className="relative w-full bg-[var(--color-surface)] sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-[var(--shadow-modal)] animate-slide-up overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex-shrink-0 border-b border-[var(--color-border)]">
              <div className="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto mt-3 sm:hidden" />
              <div className="flex items-start justify-between px-5 sm:px-6 pt-4 pb-4">
                <div className="min-w-0 pr-3">
                  <h3 className="text-lg font-bold font-serif text-[var(--color-text)]">登記服事</h3>
                  <p className="text-sm text-[var(--color-muted)] mt-0.5">
                    {modalDate ? `${formatDate(modalDate)} (${DAY_NAMES[new Date(modalDate + "T00:00:00").getDay()]})` : ""}
                    {modalItemName ? ` · ${modalItemName}` : ""}
                  </p>
                </div>
                <button
                  onClick={closeModal}
                  aria-label="關閉"
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-border-light)] transition-colors flex-shrink-0"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
              {/* Member button grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {members.map((member) => {
                  const isSelected = !showCustomInput && selectedMemberId === member.id;
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setSelectedMemberId(member.id);
                        setShowCustomInput(false);
                        setCustomName("");
                      }}
                      className={`min-h-[52px] px-3 py-3 rounded-xl text-sm font-medium transition-all border ${isSelected
                        ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-sm"
                        : "bg-[var(--color-bg-soft)] text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary-soft)]"
                        }`}
                    >
                      {member.name}
                    </button>
                  );
                })}

                {/* Other / custom name */}
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomInput(true);
                    setSelectedMemberId(undefined);
                  }}
                  className={`min-h-[52px] px-3 py-3 rounded-xl text-sm font-medium transition-all border col-span-2 sm:col-span-1 ${showCustomInput
                    ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-sm"
                    : "bg-[var(--color-accent-soft)] text-[var(--color-accent-dark)] border-[var(--color-accent)]/25 hover:border-[var(--color-accent)]/50"
                    }`}
                >
                  其他…
                </button>
              </div>

              {showCustomInput && (
                <div className="mt-3">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="請輸入您的姓名"
                    maxLength={50}
                    className="w-full px-4 py-3.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all"
                    autoFocus
                  />
                </div>
              )}

              {(modalCurrentValue?.member_id || modalCurrentValue?.custom_name) && (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={submitting}
                  className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                  清除此欄位
                </button>
              )}
            </div>

            <div className="flex-shrink-0 border-t border-[var(--color-border)] px-5 sm:px-6 py-4 flex gap-3 safe-bottom bg-[var(--color-surface)]">
              <Button variant="outline" size="md" className="flex-1" onClick={closeModal} disabled={submitting}>
                取消
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                disabled={!canConfirm || submitting}
                loading={submitting}
                onClick={handleConfirm}
              >
                確認登記
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Icebreaker modal */}
      {icebreakerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm animate-fade-in" onClick={() => setIcebreakerOpen(false)} />
          <div className="relative w-full max-h-[85vh] sm:max-w-2xl bg-[var(--color-surface)] rounded-t-3xl sm:rounded-2xl shadow-[var(--shadow-modal)] animate-slide-up overflow-hidden flex flex-col">
            <div className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] z-10 flex-shrink-0">
              <div className="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto mt-3 sm:hidden" />
              <div className="flex items-center justify-between px-6 pt-4 pb-4">
                <div>
                  <h3 className="text-lg font-bold font-serif text-[var(--color-text)]">破冰遊戲建議</h3>
                  <p className="text-sm text-[var(--color-muted)] mt-0.5">點子庫 · 共 {icebreakers.length} 個遊戲</p>
                </div>
                <button onClick={() => setIcebreakerOpen(false)} aria-label="關閉" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-border-light)] transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 safe-bottom">
              {icebreakerLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-7 w-7 border-2 border-[var(--color-primary)] border-t-transparent" />
                </div>
              ) : icebreakers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-sm text-[var(--color-muted)]">尚無破冰遊戲建議</p>
                </div>
              ) : (
                (() => {
                  const grouped: Record<string, typeof icebreakers> = {};
                  for (const g of icebreakers) {
                    const cat = g.category || "其他";
                    if (!grouped[cat]) grouped[cat] = [];
                    grouped[cat].push(g);
                  }
                  return Object.entries(grouped).map(([cat, games]) => (
                    <div key={cat} className="mb-6 last:mb-0">
                      <h4 className="text-sm font-bold text-[var(--color-primary)] mb-3 px-1 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
                        {cat}
                      </h4>
                      <div className="space-y-3">
                        {games.map((g) => (
                          <div key={g.id} className="bg-[var(--color-bg-soft)] rounded-2xl p-4 border border-[var(--color-border)]">
                            <h5 className="font-semibold text-[var(--color-text)] mb-1">{g.name}</h5>
                            {g.description && <p className="text-sm text-[var(--color-text-light)] mb-2 leading-relaxed whitespace-pre-line">{g.description}</p>}
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
                              {g.duration && <span>⏱ {g.duration}</span>}
                              {(g.people_min > 0 || g.people_max > 0) && (
                                <span>👥 {g.people_min}{g.people_max > g.people_min ? `-${g.people_max}` : ""} 人</span>
                              )}
                              {g.materials && <span>📦 {g.materials}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remarks modal */}
      {remarksModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm animate-fade-in" onClick={closeRemarksModal} />
          <div className="relative w-full bg-[var(--color-surface)] sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-[var(--shadow-modal)] animate-slide-up overflow-hidden flex flex-col">
            <div className="flex-shrink-0 border-b border-[var(--color-border)]">
              <div className="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto mt-3 sm:hidden" />
              <div className="flex items-start justify-between px-5 sm:px-6 pt-4 pb-4">
                <div className="min-w-0 pr-3">
                  <h3 className="text-lg font-bold font-serif text-[var(--color-text)]">編輯備註</h3>
                </div>
                <button
                  onClick={closeRemarksModal}
                  aria-label="關閉"
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-border-light)] transition-colors flex-shrink-0"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-5 sm:px-6 py-4">
              <textarea
                value={remarksText}
                onChange={(e) => setRemarksText(e.target.value)}
                placeholder="輸入備註內容…"
                maxLength={500}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all resize-none"
                autoFocus
              />
              <p className="text-xs text-[var(--color-muted)] mt-1.5 text-right">{remarksText.length}/500</p>
            </div>

            <div className="flex-shrink-0 border-t border-[var(--color-border)] px-5 sm:px-6 py-4 flex gap-3 safe-bottom bg-[var(--color-surface)]">
              <button
                type="button"
                onClick={closeRemarksModal}
                disabled={remarksSubmitting}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border-light)] transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveRemarks}
                disabled={remarksSubmitting}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {remarksSubmitting && (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                儲存
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-auto py-3 text-center border-t border-[var(--color-border)] bg-[var(--color-surface)]/50">
        <p className="text-sm text-[var(--color-muted)] flex items-center justify-center gap-1.5 flex-wrap">
          <span>ChurchServe</span>
          <span className="text-[var(--color-border)]">|</span>
          <span>Copyright © 2026</span>
          <a
            href="https://david-liu.pages.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--color-primary)] underline decoration-dotted transition-colors"
          >
            David Liu
          </a>
        </p>
      </footer>
    </div>
  );
}
