"use client";

import { useState, useEffect, useCallback, useMemo, useRef, startTransition } from "react";
import Link from "next/link";
import type { Group, Member, ServiceItem, Icebreaker } from "@/types";
import { Card } from "@/lib/components/ui/Card";
import { Button } from "@/lib/components/ui/Button";
import { Select } from "@/lib/components/ui/Select";

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

function isPastWeek(dateStr: string): boolean {
  const now = new Date();
  const day = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - day);
  startOfWeek.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return target < startOfWeek;
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

const serviceDescriptions: Record<string, string> = {
  "破冰": "營造歡樂氣氛，讓大家敞開心房。\n• 設計簡單有趣的遊戲，鼓勵全員參與\n• 可加入獎品或小懲罰增加趣味性\n• 掌控時間，重點是讓大家開心互動",
  "敬拜讚美": "透過詩歌帶領會眾朝見神。\n• 預備 1–2 首詩歌，若選擇 2 首請留意整體時間\n• 挑選會眾熟悉、容易跟唱的詩歌\n• 提前將詩歌連結或歌詞傳到群組，讓大家先行預備\n• 事先禱告、預備要說的話，確保詩歌選擇與帶領方向一致",
  "見證": "分享各自經歷神的見證。\n• 可事先邀請幾位小組員預備分享內容，聚會時輪流分享\n• 由主領掌握時間與節奏，適時 cue 分享者上台",
  "見證(經歷神)": "分享個人經歷，一起看見神的作為。\n• 可事先邀請弟兄姊妹（找莊腳）預備分享內容\n• 由主領掌控節奏，適時 cue 分享者上台",
  "見證（經歷神）": "分享個人經歷，一起看見神的作為。\n• 可事先邀請弟兄姊妹（找莊腳）預備分享內容\n• 由主領掌控節奏，適時 cue 分享者上台",
  "信息分享": "小組長針對小組的牧養時刻。\n• 信息結束後，由小組長帶領回應信息的禱告，幫助大家將信息落實在生活中\n• 分組禱告（代禱事項）：人數過多時較難深入關心每個人，建議分成小小組分享代禱，效果更好",
  "報告": "• 聚會前先跟小組長確認是否有事項需要報告\n• 報告教會相關資訊與近期活動\n• 若有活動或聚會需要，可在現場與大家確認時間，並記錄在記事本中以便日後查詢",
};

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
  const [memberSearch, setMemberSearch] = useState("");
  const [icebreakers, setIcebreakers] = useState<Icebreaker[]>([]);
  const [icebreakerOpen, setIcebreakerOpen] = useState(false);
  const [icebreakerLoading, setIcebreakerLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  const [remarksModalOpen, setRemarksModalOpen] = useState(false);
  const [remarksScheduleId, setRemarksScheduleId] = useState<number | null>(null);
  const [remarksText, setRemarksText] = useState("");
  const [remarksSubmitting, setRemarksSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [pauseTarget, setPauseTarget] = useState<ScheduleDate | null>(null);
  const groupName = useMemo(() => groups.find((g) => g.id === selectedGroup)?.name ?? "", [groups, selectedGroup]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [serviceDescTitle, setServiceDescTitle] = useState("");
  const [serviceDescOpen, setServiceDescOpen] = useState(false);
  const [adminPayload, setAdminPayload] = useState<{ role: string; username: string; managedGroupId?: number } | null>(null);

  useEffect(() => {
    startTransition(() => {
      if (typeof window === "undefined") return;
      try {
        const t = localStorage.getItem("admin_token");
        if (t) { const p = JSON.parse(atob(t.split(".")[1])); if (p?.role) setAdminPayload(p); }
      } catch { /* ignore */ }
    });
  }, []);

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

      // Add non-Saturday special events
      const saturdaySet = new Set(dates);
      for (const s of apiSchedules) {
        if (s.is_special_event && !saturdaySet.has(s.date)) {
          enriched.push({
            date: s.date,
            dayOfWeek: DAY_NAMES[new Date(s.date + "T00:00:00").getDay()],
            scheduleId: s.id || null,
            isSpecialEvent: 1,
            eventTitle: s.event_title || null,
            isLocked: s.is_locked || 0,
            lockMessage: s.lock_message || null,
            remarks: s.remarks || null,
            assignments: {},
          });
        }
      }

      enriched.sort((a, b) => a.date.localeCompare(b.date));

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
    setMemberSearch("");
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

  const openPauseModal = (schedule: ScheduleDate) => {
    setPauseTarget(schedule);
    setPauseModalOpen(true);
  };

  const handleTogglePause = async () => {
    if (!pauseTarget) return;
    const token = localStorage.getItem("admin_token");
    if (!token || !pauseTarget.scheduleId) return;
    try {
      const res = await fetch(`/api/admin/schedules/${pauseTarget.scheduleId}/lock`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          is_locked: pauseTarget.isLocked ? 0 : 1,
          lock_message: pauseTarget.isLocked ? null : "小組暫停",
        }),
      });
      if (res.ok) {
        setPauseModalOpen(false);
        setPauseTarget(null);
        fetchSchedules();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "操作失敗");
        setTimeout(() => setErrorMsg(""), 3000);
      }
    } catch {
      setErrorMsg("網路錯誤，請稍後再試");
      setTimeout(() => setErrorMsg(""), 3000);
    }
  };

  useEffect(() => {
    if (!remarksModalOpen) {
      document.documentElement.style.setProperty("--kb-h", "0px");
      return;
    }
    const isMobile = "ontouchstart" in window || window.innerWidth < 768;
    if (!isMobile || typeof visualViewport === "undefined") return;
    let timer: ReturnType<typeof setTimeout>;
    const handler = () => {
      const vv = visualViewport;
      if (!vv) return;
      const diff = window.innerHeight - vv.height;
      const kb = diff > 80 ? Math.max(0, diff - (vv.offsetTop || 0)) : 0;
      clearTimeout(timer);
      timer = setTimeout(() => {
        document.documentElement.style.setProperty("--kb-h", kb + "px");
      }, 80);
    };
    window.visualViewport?.addEventListener("resize", handler);
    window.visualViewport?.addEventListener("scroll", handler);
    handler();
    document.documentElement.style.setProperty("touch-action", "none");
    return () => {
      window.visualViewport?.removeEventListener("resize", handler);
      window.visualViewport?.removeEventListener("scroll", handler);
      clearTimeout(timer);
      document.documentElement.style.setProperty("--kb-h", "0px");
      document.documentElement.style.removeProperty("touch-action");
    };
  }, [remarksModalOpen]);

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
    <>
    <div className="min-h-screen flex flex-col">
      {/* Brand header — solid earth green */}
      <header className="sticky top-0 z-40 bg-[var(--color-header)] text-[var(--color-header-text)] shadow-[var(--shadow-header)]">
        <div className="max-w-6xl mx-auto px-3 sm:px-4">
          {/* Mobile: two rows */}
          <div className="flex sm:hidden flex-col py-1.5 gap-1">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0">
                <span className="w-6 h-6 rounded-lg bg-[var(--color-primary-soft)] flex items-center justify-center flex-shrink-0">
                  <SproutIcon className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                </span>
                <h1 className="text-sm font-bold font-serif tracking-wide text-[var(--color-text)]">
                  ChurchServe
                </h1>
              </div>
              <Select
                value={String(selectedGroup)}
                onChange={(v) => setSelectedGroup(Number(v))}
                options={groups.length === 0 ? [{ value: "0", label: "尚無小組" }] : groups.map((g) => ({ value: String(g.id), label: g.name }))}
                ariaLabel="選擇小組"
                className="max-w-[120px]"
              />
            </div>
            <div className="flex items-center justify-center gap-0.5">
              <button onClick={prevMonth} aria-label="上一個月" className="w-8 h-8 rounded-lg hover:bg-[var(--color-border-light)] flex items-center justify-center text-[var(--color-text-light)] transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <span className="min-w-[120px] text-center text-sm font-semibold tracking-wide text-[var(--color-text)]">{currentLabel}</span>
              <button onClick={nextMonth} aria-label="下一個月" className="w-8 h-8 rounded-lg hover:bg-[var(--color-border-light)] flex items-center justify-center text-[var(--color-text-light)] transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
          </div>

          {/* Desktop: two-row layout */}
          <div className="hidden sm:block">
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
                  options={groups.length === 0 ? [{ value: "0", label: "尚無小組" }] : groups.map((g) => ({ value: String(g.id), label: g.name }))}
                  ariaLabel="選擇小組"
                  className="max-w-[140px] sm:max-w-[200px]"
                />
              </div>
            </div>
            <div className="flex items-center justify-center gap-1 pb-3">
              <button onClick={prevMonth} aria-label="上一個月" className="w-11 h-11 rounded-xl hover:bg-[var(--color-border-light)] flex items-center justify-center text-[var(--color-text-light)] transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
              <div className="min-w-[160px] sm:min-w-[180px] text-center px-2">
                <span className="text-base sm:text-lg font-semibold tracking-wide text-[var(--color-text)]">{currentLabel}</span>
              </div>
              <button onClick={nextMonth} aria-label="下一個月" className="w-11 h-11 rounded-xl hover:bg-[var(--color-border-light)] flex items-center justify-center text-[var(--color-text-light)] transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            </div>
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
            <button
              onClick={() => { setMenuOpen(false); setExportOpen(true); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-primary-soft)] transition-colors border-b border-[var(--color-border)]"
            >
              <svg className="w-5 h-5 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              匯出
            </button>
            {adminPayload ? (
              <>
                <div className="px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg-soft)]">
                  <div className="text-xs font-medium text-[var(--color-text)]">{adminPayload.username}</div>
                  <div className="text-[10px] text-[var(--color-muted)] mt-0.5">
                    {({ super_admin: "超級管理員", admin: "管理員", campus_leader: "分堂長", district_leader: "牧區長", zone_leader: "小區長", group_leader: "小組長" } as Record<string, string>)[adminPayload.role] || adminPayload.role}
                  </div>
                </div>
                <Link href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-primary-soft)] transition-colors border-b border-[var(--color-border)]"
                >
                  <svg className="w-5 h-5 text-[var(--color-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                  後台儀表板
                </Link>
                <button
                  onClick={() => { setMenuOpen(false); setShowLogoutModal(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger)]/5 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                  登出
                </button>
              </>
            ) : (
              <Link href="/admin/login"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-primary-soft)] transition-colors"
              >
                <svg className="w-5 h-5 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M13 12H3" />
                </svg>
                登入後台
              </Link>
            )}
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
                    <th rowSpan={2} className="w-[1%] px-1.5 sm:px-3 py-3.5 text-center font-semibold text-xs sm:text-sm text-[var(--color-table-head-text)] whitespace-nowrap border-b border-r border-[var(--color-border)]">
                      日期
                    </th>
                    {serviceItemGroups.map((group) => {
                      if (group.category) {
                        return (
                          <th key={group.category} colSpan={group.items.length} className="px-1.5 sm:px-3 py-3 text-center font-semibold text-xs sm:text-sm text-[var(--color-table-head-text)] border-b border-r border-[var(--color-border)] cursor-pointer hover:text-[var(--color-primary)] transition-colors" onClick={() => { if (group.category) { setServiceDescTitle(group.category); setServiceDescOpen(true); } }}>
                            {group.category?.replace(/[（）]/g, (c) => c === "（" ? "(" : ")")}
                          </th>
                        );
                      }
                      return group.items.map((item) => (
                        <th key={item.id} rowSpan={2} className="whitespace-nowrap px-1.5 sm:px-3 py-3.5 text-center font-semibold text-xs sm:text-sm text-[var(--color-table-head-text)] border-b border-r border-[var(--color-border)] cursor-pointer hover:text-[var(--color-primary)] transition-colors" onClick={() => { setServiceDescTitle(item.name); setServiceDescOpen(true); }}>
                          {item.name}
                        </th>
                      ));
                    })}
                    <th rowSpan={2} className="min-w-[100px] px-1.5 sm:px-3 py-3.5 text-center font-semibold text-xs sm:text-sm text-[var(--color-table-head-text)] border-b border-[var(--color-border)]">備註</th>
                  </tr>
                  {serviceItemGroups.some((g) => g.category) && (
                    <tr className="bg-[var(--color-table-head)]">
                      {serviceItemGroups.map((group) => {
                        if (group.category) {
                          return group.items.map((item) => (
                            <th key={item.id} className="whitespace-nowrap px-1.5 sm:px-3 py-3.5 text-center font-semibold text-xs sm:text-sm text-[var(--color-table-head-text)] border-b border-r border-[var(--color-border)]">
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
                    const isPast = isPastWeek(schedule.date);
                    const rowPast = isPast ? "opacity-60" : "";

                    if (schedule.isLocked) {
                      return (
                        <tr key={schedule.date} className={rowPast}>
                          <td
                            className={
                              "py-4 font-semibold text-center whitespace-nowrap border-r border-[var(--color-border)] text-[var(--color-text)] align-middle" +
                              (isCurrent ? " border-l-4 border-l-[var(--color-accent)] pl-1.5 sm:pl-3 pr-1.5 sm:pr-3" : " px-1.5 sm:px-3")
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
                          <td colSpan={serviceItems.length + 1} className="px-1.5 sm:px-3 py-4 text-center stripe-locked">
                            <span className="inline-flex items-center gap-2 text-base text-[var(--color-muted)] font-medium">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                <rect x="3" y="11" width="18" height="11" rx="2" />
                                <path d="M7 11V7a5 5 0 0110 0v4" />
                              </svg>
                              {schedule.lockMessage || "暫停聚會"}
                              {adminPayload && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); openPauseModal(schedule); }}
                                  className="ml-2 px-2 py-0.5 rounded text-[8px] font-medium text-white bg-[#7C2D12] hover:bg-[#5E1F0A] transition-colors"
                                >
                                  取消暫停
                                </button>
                              )}
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    if (schedule.isSpecialEvent) {
                      return (
                        <tr key={schedule.date} className={rowPast}>
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
                          "transition-colors" +
                          (isPast ? "" : " hover:bg-[var(--color-primary-soft)]/50") +
                          " " + rowPast
                        }
                      >
                        <td
                          className={
                            "py-4 font-semibold text-center whitespace-nowrap border-r border-[var(--color-border)] text-[var(--color-text)] align-middle" +
                            (isCurrent ? " border-l-4 border-l-[var(--color-accent)] pl-1.5 sm:pl-3 pr-1.5 sm:pr-3" : " px-1.5 sm:px-3")
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
                            {adminPayload && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); openPauseModal(schedule); }}
                                className="mt-1.5 px-2 py-0.5 rounded text-[8px] font-medium text-white bg-[#7C2D12] hover:bg-[#5E1F0A] transition-colors"
                              >
                                暫停
                              </button>
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
                              className="px-1.5 sm:px-3 py-4 text-center border-r border-[var(--color-border)] last:border-r-0 cursor-pointer hover:bg-[var(--color-accent-soft)] transition-colors"
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
                          className="px-1.5 sm:px-3 py-4 text-center text-xs cursor-pointer hover:bg-[var(--color-accent-soft)] transition-colors min-w-[100px]"
                          onClick={() => openRemarksModal(schedule)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openRemarksModal(schedule);
                            }
                          }}
                        >
                          {schedule.remarks ? (
                            <span className="text-[var(--color-muted)] whitespace-pre-line mx-auto text-sm leading-relaxed">{schedule.remarks}</span>
                          ) : (
                            <span className="text-[var(--color-accent)] opacity-85 hover:opacity-100 transition-opacity text-sm font-medium">+ 備註</span>
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
                const isPast = isPastWeek(schedule.date);
                const pastClass = isPast ? "opacity-60" : "";

                if (schedule.isLocked) {
                  return (
                    <div key={schedule.date} className={"rounded-2xl overflow-hidden border border-[var(--color-border)] stripe-locked " + pastClass}>
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
                          {adminPayload && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openPauseModal(schedule); }}
                              className="ml-2 px-2 py-0.5 rounded text-[8px] font-medium text-white bg-[#7C2D12] hover:bg-[#5E1F0A] transition-colors"
                            >
                              取消暫停
                            </button>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                }

                if (schedule.isSpecialEvent) {
                  return (
                    <div key={schedule.date} className={"rounded-2xl overflow-hidden bg-[var(--color-special-bg)] shadow-[var(--shadow-card)] " + pastClass}>
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
                    className={`overflow-hidden ${isCurrent ? "ring-2 ring-[var(--color-accent)]/40" : ""} ${pastClass}`}
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
                        {adminPayload && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openPauseModal(schedule); }}
                            className="ml-2 px-2 py-0.5 rounded text-[8px] font-medium text-white bg-[#7C2D12] hover:bg-[#5E1F0A] transition-colors"
                          >
                            暫停
                          </button>
                        )}
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
                              <span className={`text-sm font-medium px-3 py-1 rounded-full border whitespace-nowrap truncate max-w-[140px] ${getMemberChipClass(name)}`}>
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
                          <span className="text-sm text-[var(--color-muted)] text-right max-w-[60%] whitespace-pre-line leading-relaxed">{schedule.remarks}</span>
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
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-xl bg-[var(--color-danger)] text-white text-sm shadow-lg animate-slide-up max-w-[90vw]" role="alert">
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
              {/* Member search */}
              <div className="relative mb-3">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="搜尋成員…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] text-sm text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all"
                />
              </div>
              {/* Member button grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {members.filter((m) => memberSearch === "" || m.name.includes(memberSearch)).map((member) => {
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

      {/* Export modal */}
      {exportOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm animate-fade-in" onClick={() => setExportOpen(false)} />
          <div className="relative w-full sm:max-w-sm bg-[var(--color-surface)] rounded-t-3xl sm:rounded-2xl shadow-[var(--shadow-modal)] animate-slide-up overflow-hidden">
            <div className="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto mt-3 sm:hidden" />
            <div className="flex items-center justify-between px-6 pt-4 pb-3">
              <h3 className="text-lg font-bold font-serif text-[var(--color-text)]">匯出</h3>
              <button onClick={() => setExportOpen(false)} aria-label="關閉" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-border-light)] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 pb-6 space-y-3">
              <button
                onClick={async () => {
                  setExportOpen(false);
                  const startMonth = currentMonth % 2 === 1 ? currentMonth : currentMonth - 1;
                  const ym1 = `${currentYear}-${String(startMonth).padStart(2, "0")}`;
                  const ym2 = `${currentYear}-${String(startMonth + 1).padStart(2, "0")}`;
                  const url = `/api/schedules/${selectedGroup}/${ym1}/image?month2=${ym2}`;
                  try {
                    const res = await fetch(url);
                    const svg = await res.text();
                    const canvas = document.createElement("canvas");
                    const img = new Image();
                    const blobUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
                    await new Promise<void>((r, reject) => { img.onload = () => r(); img.onerror = reject; img.src = blobUrl; });
                    canvas.width = img.naturalWidth * 2;
                    canvas.height = img.naturalHeight * 2;
                    const ctx = canvas.getContext("2d")!;
                    ctx.scale(2, 2);
                    ctx.drawImage(img, 0, 0);
                    URL.revokeObjectURL(blobUrl);
                    canvas.toBlob((pngBlob) => {
                      if (!pngBlob) { setErrorMsg("匯出圖片失敗"); return; }
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(pngBlob);
                      a.download = `${groupName}-${startMonth}-${startMonth + 1}月-服事表.png`;
                      a.click();
                    });
                  } catch { setErrorMsg("匯出圖片失敗"); }
                }}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-[var(--color-bg-soft)] hover:bg-[var(--color-primary-soft)] transition-colors border border-[var(--color-border)] group"
              >
                <div className="w-11 h-11 rounded-xl bg-[var(--color-primary-soft)] flex items-center justify-center text-[var(--color-primary)] group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-[var(--color-text)]">圖片 (PNG)</div>
                  <div className="text-xs text-[var(--color-muted)] mt-0.5">下載服事表為高解析度圖片</div>
                </div>
              </button>
              <button
                onClick={async () => {
                  setExportOpen(false);
                  const startMonth = currentMonth % 2 === 1 ? currentMonth : currentMonth - 1;
                  const ym1 = `${currentYear}-${String(startMonth).padStart(2, "0")}`;
                  const ym2 = `${currentYear}-${String(startMonth + 1).padStart(2, "0")}`;
                  const url = `/api/schedules/${selectedGroup}/${ym1}/image?month2=${ym2}`;
                  try {
                    const res = await fetch(url);
                    const svg = await res.text();
                    const canvas = document.createElement("canvas");
                    const img = new Image();
                    const blobUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
                    await new Promise<void>((r, reject) => { img.onload = () => r(); img.onerror = reject; img.src = blobUrl; });
                    canvas.width = img.naturalWidth * 2;
                    canvas.height = img.naturalHeight * 2;
                    const ctx = canvas.getContext("2d")!;
                    ctx.scale(2, 2);
                    ctx.drawImage(img, 0, 0);
                    URL.revokeObjectURL(blobUrl);
                    const dataUrl = canvas.toDataURL("image/png");
                    const { default: jsPDF } = await import("jspdf");
                    const doc = new jsPDF({ orientation: "landscape", unit: "px" });
                    const pdfW = doc.internal.pageSize.getWidth();
                    const pdfH = (img.naturalHeight * pdfW) / img.naturalWidth;
                    doc.addImage(dataUrl, "PNG", 0, 0, pdfW, pdfH);
                    doc.save(`${groupName}-${startMonth}-${startMonth + 1}月-服事表.pdf`);
                  } catch { setErrorMsg("匯出 PDF 失敗"); }
                }}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-[var(--color-bg-soft)] hover:bg-[var(--color-primary-soft)] transition-colors border border-[var(--color-border)] group"
              >
                <div className="w-11 h-11 rounded-xl bg-[var(--color-primary-soft)] flex items-center justify-center text-[var(--color-primary)] group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M6 9V3h12v6M6 21h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM6 13v4h12v-4" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="font-semibold text-[var(--color-text)]">文件 (PDF)</div>
                  <div className="text-xs text-[var(--color-muted)] mt-0.5">匯出服事表為 PDF 文件</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Service description modal */}
      {serviceDescOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm animate-fade-in" onClick={() => setServiceDescOpen(false)} />
          <div className="relative w-full sm:max-w-lg bg-[var(--color-surface)] rounded-t-3xl sm:rounded-2xl shadow-[var(--shadow-modal)] animate-slide-up overflow-hidden">
            <div className="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto mt-3 sm:hidden" />
            <div className="flex items-center justify-between px-6 pt-4 pb-3">
              <h3 className="text-lg font-bold font-serif text-[var(--color-text)]">{serviceDescTitle.replace(/[（）]/g, (c) => c === "（" ? "(" : ")")}</h3>
              <button onClick={() => setServiceDescOpen(false)} aria-label="關閉" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[var(--color-border-light)] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 pb-6">
              <div className="bg-[var(--color-bg-soft)] rounded-2xl p-5 text-sm text-[var(--color-text)] leading-relaxed whitespace-pre-line">
                {serviceDescriptions[serviceDescTitle] || serviceDescriptions[serviceDescTitle.replace(/[（(].*?[）)]/g, "").trim()] || "尚無說明"}
              </div>
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/35 backdrop-blur-sm animate-fade-in" onClick={closeRemarksModal} />
          <div
            className="relative w-full bg-[var(--color-surface)] sm:max-w-md sm:rounded-2xl sm:mx-4 shadow-[var(--shadow-modal)] flex flex-col overflow-hidden"
            style={{ paddingBottom: "var(--kb-h, 0px)" }}
          >
            <div className="flex-shrink-0 border-b border-[var(--color-border)]">
              <div className="flex items-start justify-between px-5 sm:px-6 pt-5 pb-4">
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

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 min-h-0" style={{ WebkitOverflowScrolling: "touch" }}>
              <textarea
                ref={textareaRef}
                value={remarksText}
                onChange={(e) => setRemarksText(e.target.value)}
                placeholder="輸入備註內容…"
                maxLength={500}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-soft)] text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)] transition-all resize-none"
                autoFocus
                onFocus={(e) => e.target.focus({ preventScroll: true } as FocusOptions)}
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

      {pauseModalOpen && pauseTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setPauseModalOpen(false); setPauseTarget(null); }} />
          <div className="relative bg-[var(--color-surface)] rounded-2xl shadow-2xl border border-[var(--color-border)] w-full max-w-sm animate-fadeIn overflow-hidden">
            <div className="pt-8 pb-6 px-7 text-center">
              <div className={"inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 " + (pauseTarget.isLocked ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600")}>
                {pauseTarget.isLocked ? (
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                )}
              </div>
              <h2 className="text-lg font-bold font-serif text-[var(--color-text)] mb-2">
                {pauseTarget.isLocked ? "取消暫停" : "暫停小組"}
              </h2>
              <p className="text-sm text-[var(--color-muted)]">
                {pauseTarget.isLocked
                  ? `確定要恢復 ${pauseTarget.date.slice(5)} 的聚會嗎？`
                  : `確定要暫停 ${pauseTarget.date.slice(5)} 的小組聚會嗎？`}
              </p>
            </div>
            <div className="flex gap-3 px-7 pb-7">
              <button
                onClick={() => { setPauseModalOpen(false); setPauseTarget(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-light)] bg-[var(--color-bg)] hover:bg-[var(--color-border-light)] transition-all"
              >
                取消
              </button>
              <button
                onClick={handleTogglePause}
                className={"flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all " + (pauseTarget.isLocked ? "bg-amber-500 hover:bg-amber-600" : "bg-[#7C2D12] hover:bg-[#5E1F0A]")}
              >
                {pauseTarget.isLocked ? "確認恢復" : "確認暫停"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="logout-modal-title">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)} />
          <div className="relative bg-[var(--color-surface)] rounded-2xl shadow-2xl border border-[var(--color-border)] w-full max-w-sm animate-fadeIn overflow-hidden">
            <div className="pt-8 pb-6 px-7 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-50 text-[#DC2626] mb-4">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
              </div>
              <h2 id="logout-modal-title" className="text-lg font-bold font-serif text-[var(--color-text)] mb-2">確認登出</h2>
              <p className="text-sm text-[var(--color-muted)]">您確定要登出嗎？</p>
            </div>
            <div className="flex gap-3 px-7 pb-7">
              <button onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--color-text-light)] bg-[var(--color-bg)] hover:bg-[var(--color-border-light)] transition-all"
              >取消</button>
              <button onClick={() => { setShowLogoutModal(false); localStorage.removeItem("admin_token"); setAdminPayload(null); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] transition-all"
              >確認登出</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
