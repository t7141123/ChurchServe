"use client";

import { useState, useEffect, useCallback, useMemo, startTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Select } from "@/lib/components/ui/Select";

interface ServiceItem {
  id: number;
  name: string;
  category: string;
  display_order: number;
}

interface Member {
  id: number;
  name: string;
  is_active: number;
}

interface ScheduleRow {
  date: string;
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
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    if (d.getDay() === 6) {
      dates.push(`${year}-${String(month).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

const DAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

export default function SchedulePage() {
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId");
  const [groupName, setGroupName] = useState("");
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

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

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(""), 3000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  const [lockModal, setLockModal] = useState(false);
  const [lockDate, setLockDate] = useState("");
  const [lockMessage, setLockMessage] = useState("");
  const [specialModal, setSpecialModal] = useState(false);
  const [specialDate, setSpecialDate] = useState("");
  const [specialTitle, setSpecialTitle] = useState("");

  const [editingRemarks, setEditingRemarks] = useState<{ scheduleId: number; date: string; value: string } | null>(null);

  const [assignModal, setAssignModal] = useState(false);
  const [assignScheduleId, setAssignScheduleId] = useState<number | null>(null);
  const [assignItemId, setAssignItemId] = useState<number | null>(null);
  const [assignCurrentValue, setAssignCurrentValue] = useState<{ member_id: number | null; custom_name: string | null } | null>(null);
  const [customName, setCustomName] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const authHeaders = (): Record<string, string> => {
    const t = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    return t ? { "Content-Type": "application/json", Authorization: `Bearer ${t}` } : { "Content-Type": "application/json" };
  };

  const fetchData = useCallback(async () => {
    const startMonth = currentMonth % 2 === 1 ? currentMonth : currentMonth - 1;
    const ym1 = `${currentYear}-${String(startMonth).padStart(2, "0")}`;
    const ym2 = `${currentYear}-${String(startMonth + 1).padStart(2, "0")}`;
    try {
      const [groupRes, schedRes1, schedRes2, itemRes, memberRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`, { headers: authHeaders() }),
        fetch(`/api/schedules/${groupId}/${ym1}`, { headers: authHeaders() }),
        fetch(`/api/schedules/${groupId}/${ym2}`, { headers: authHeaders() }),
        fetch(`/api/groups/${groupId}/service-items`, { headers: authHeaders() }),
        fetch(`/api/groups/${groupId}/members`, { headers: authHeaders() }),
      ]);
      if (!groupRes.ok || !schedRes1.ok || !schedRes2.ok || !itemRes.ok || !memberRes.ok) throw new Error("載入失敗");
      const groupData = await groupRes.json();
      const schedData1 = await schedRes1.json();
      const schedData2 = await schedRes2.json();
      const itemData = await itemRes.json();
      const memberData = await memberRes.json();

      setGroupName(groupData.name);
      setServiceItems(itemData);
      setMembers(memberData);

      const saturdays1 = getSaturdaysOfMonth(currentYear, startMonth);
      const saturdays2 = getSaturdaysOfMonth(currentYear, startMonth + 1);
      const saturdays = [...saturdays1, ...saturdays2];
      const apiSchedules = [...(schedData1 || []), ...(schedData2 || [])];

      const enriched: ScheduleRow[] = [];
      const seenDates = new Set<string>();

      for (const dateStr of saturdays) {
        seenDates.add(dateStr);
        const existing = apiSchedules.find((s: { date: string }) => s.date === dateStr);
        const assignmentsMap: ScheduleRow["assignments"] = {};
        if (existing?.assignments) {
          for (const a of existing.assignments) {
            assignmentsMap[a.service_item_order || 0] = {
              member_id: a.member_id,
              custom_member_name: a.custom_member_name,
              member_name: a.member_name,
              id: a.id,
            };
          }
        }
        enriched.push({
          date: dateStr,
          scheduleId: existing?.id || null,
          isSpecialEvent: existing?.is_special_event || 0,
          eventTitle: existing?.event_title || null,
          isLocked: existing?.is_locked || 0,
          lockMessage: existing?.lock_message || null,
          remarks: existing?.remarks || null,
          assignments: assignmentsMap,
        });
      }

      for (const s of apiSchedules) {
        if (!seenDates.has(s.date)) {
          seenDates.add(s.date);
          const assignmentsMap: ScheduleRow["assignments"] = {};
          if (s.assignments) {
            for (const a of s.assignments) {
              assignmentsMap[a.service_item_order || 0] = {
                member_id: a.member_id,
                custom_member_name: a.custom_member_name,
                member_name: a.member_name,
                id: a.id,
              };
            }
          }
          enriched.push({
            date: s.date,
            scheduleId: s.id || null,
            isSpecialEvent: s.is_special_event || 0,
            eventTitle: s.event_title || null,
            isLocked: s.is_locked || 0,
            lockMessage: s.lock_message || null,
            remarks: s.remarks || null,
            assignments: assignmentsMap,
          });
        }
      }

      enriched.sort((a, b) => a.date.localeCompare(b.date));
      setRows(enriched);
    } catch {
      setErrorMsg("載入排班資料失敗");
    } finally {
      setLoading(false);
    }
  }, [groupId, currentYear, currentMonth]);

  useEffect(() => { startTransition(() => { fetchData(); }); }, [fetchData]);

  const handleLock = async () => {
    if (!lockDate) return;
    try {
      const sched = rows.find((r) => r.date === lockDate);
      if (!sched?.scheduleId) {
        const res = await fetch("/api/schedules/special", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ group_id: Number(groupId), date: lockDate, event_title: lockMessage || "暫停聚會" }),
        });
        if (!res.ok) throw new Error("鎖定失敗");
      } else {
        const token = localStorage.getItem("admin_token");
        const res = await fetch(`/api/admin/schedules/${sched.scheduleId}/lock`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ is_locked: 1, lock_message: lockMessage }),
        });
        if (!res.ok) throw new Error("鎖定失敗");
      }
      setLockModal(false);
      fetchData();
    } catch {
      setErrorMsg("鎖定失敗");
    }
  };

  const handleUnlock = async (scheduleId: number) => {
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/schedules/${scheduleId}/lock`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_locked: 0, lock_message: null }),
      });
      if (!res.ok) throw new Error("解鎖失敗");
      fetchData();
    } catch {
      setErrorMsg("解鎖失敗");
    }
  };

  const handleQuickPause = async (date: string, scheduleId: number | null) => {
    try {
      const token = localStorage.getItem("admin_token");
      if (scheduleId) {
        const res = await fetch(`/api/admin/schedules/${scheduleId}/lock`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ is_locked: 1, lock_message: "小組暫停" }),
        });
        if (!res.ok) throw new Error("暫停失敗");
        fetchData();
      }
    } catch {
      setErrorMsg("暫停失敗");
    }
  };

  const handleSpecialEvent = async () => {
    if (!specialDate || !specialTitle.trim()) return;
    try {
      const res = await fetch("/api/schedules/special", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: Number(groupId), date: specialDate, event_title: specialTitle.trim() }),
      });
      if (!res.ok) throw new Error("新增特殊日失敗");
      setSpecialModal(false);
      setSpecialTitle("");
      fetchData();
    } catch {
      setErrorMsg("新增特殊日失敗");
    }
  };

  const openAssignModal = (scheduleId: number, itemId: number, currentValue: { member_id: number | null; custom_name: string | null } | null) => {
    setAssignScheduleId(scheduleId);
    setAssignItemId(itemId);
    setAssignCurrentValue(currentValue);
    setCustomName("");
    setShowCustomInput(false);
    setAssignModal(true);
  };

  const handleAssign = async (memberId: number | null, customNameVal?: string) => {
    if (assignScheduleId === null || assignItemId === null) return;
    try {
      const body: { member_id?: number | null; custom_member_name?: string | null } = {};
      if (memberId) body.member_id = memberId;
      else if (customNameVal) body.custom_member_name = customNameVal;
      else body.member_id = null;

      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/assignments/0`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...body, schedule_id: assignScheduleId, service_item_id: assignItemId }),
      });
      if (!res.ok) throw new Error("指派失敗");
      setAssignModal(false);
      fetchData();
    } catch {
      setErrorMsg("指派失敗");
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/admin/schedule"
          aria-label="返回排班總覽"
          className="w-8 h-8 rounded-xl bg-[var(--color-border-light)] flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold font-serif text-[var(--color-primary-dark)]">{groupName}</h1>
          <p className="text-xs text-[var(--color-muted)]">排班管理</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const startMonth = currentMonth % 2 === 1 ? currentMonth : currentMonth - 1;
              if (startMonth === 1) {
                setCurrentMonth(11);
                setCurrentYear(currentYear - 1);
              } else {
                setCurrentMonth(startMonth - 2);
              }
            }}
            aria-label="上兩個月"
            className="w-9 h-9 rounded-xl bg-[var(--color-border-light)] flex items-center justify-center hover:bg-[var(--color-border)] transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="font-medium min-w-[140px] text-center text-sm">
            {(() => {
              const startMonth = currentMonth % 2 === 1 ? currentMonth : currentMonth - 1;
              return `${currentYear} 年 ${startMonth} - ${startMonth + 1} 月`;
            })()}
          </span>
          <button
            onClick={() => {
              const startMonth = currentMonth % 2 === 1 ? currentMonth : currentMonth - 1;
              if (startMonth === 11) {
                setCurrentMonth(1);
                setCurrentYear(currentYear + 1);
              } else {
                setCurrentMonth(startMonth + 2);
              }
            }}
            aria-label="下兩個月"
            className="w-9 h-9 rounded-xl bg-[var(--color-border-light)] flex items-center justify-center hover:bg-[var(--color-border)] transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSpecialModal(true)} className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-dark)] shadow-sm shadow-[var(--color-accent)]/20 transition-all hover:shadow-md hover:translate-y-[-1px] active:translate-y-[0px]">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              特殊日
            </span>
          </button>
          <button
            onClick={() => { setLockDate(""); setLockMessage(""); setLockModal(true); }}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[var(--color-danger)] to-[#B91C1C] shadow-sm shadow-[var(--color-danger)]/20 transition-all hover:shadow-md hover:translate-y-[-1px] active:translate-y-[0px]"
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              鎖定
            </span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20 animate-fadeIn" role="alert">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[var(--color-primary)] border-t-transparent mx-auto" />
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 glass rounded-2xl animate-fadeIn">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-border-light)] mb-4">
            <svg className="w-8 h-8 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
            </svg>
          </div>
          <p className="text-sm text-[var(--color-muted)]">本月無排班</p>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden shadow-card animate-slideUp">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                {/* First row header */}
                <tr>
                  <th
                    rowSpan={2}
                    className="sticky top-0 px-4 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider bg-[var(--color-primary)] whitespace-nowrap align-middle border-b border-r border-white/15"
                  >
                    日期
                  </th>
                  {serviceItemGroups.map((group) => {
                    if (group.category) {
                      return (
                        <th
                          key={group.category}
                          colSpan={group.items.length}
                          className="sticky top-0 px-3 py-2 text-center text-xs font-semibold text-white uppercase tracking-wider bg-[var(--color-primary)] border-b border-r border-white/15"
                        >
                          {group.category}
                        </th>
                      );
                    }
                    return group.items.map((item) => (
                      <th
                        key={item.id}
                        rowSpan={2}
                        className="sticky top-0 px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider bg-[var(--color-primary)] whitespace-nowrap align-middle border-b border-r border-white/15"
                      >
                        {item.name}
                      </th>
                    ));
                  })}
                  <th
                    rowSpan={2}
                    className="sticky top-0 px-3 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider bg-[var(--color-primary)] whitespace-nowrap min-w-[80px] align-middle border-b border-white/10"
                  >
                    備註
                  </th>
                </tr>
                
                {/* Second row header for categorized sub-items */}
                {serviceItemGroups.some((g) => g.category) && (
                  <tr>
                    {serviceItemGroups.map((group) => {
                      if (group.category) {
                        return group.items.map((item) => (
                          <th
                            key={item.id}
                            className="sticky top-[32px] px-3 py-2 text-center text-[10px] font-semibold text-white uppercase tracking-wider bg-[var(--color-primary)] whitespace-nowrap border-b border-r border-white/15"
                          >
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
                {rows.map((row, idx) => (
                  <tr key={row.date} className={`transition-colors ${idx % 2 === 0 ? "bg-[var(--color-row-even)]" : "bg-[var(--color-row-odd)]"} hover:bg-[var(--color-primary)]/5`}>
                    {row.isLocked ? (
                      <td colSpan={serviceItems.length + 2} className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2 text-sm text-[var(--color-muted)]">
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0110 0v4" />
                          </svg>
                          <span>{row.lockMessage || "暫停聚會"}</span>
                          {row.scheduleId != null && (
                            <button onClick={() => handleUnlock(row.scheduleId!)} className="ml-2 px-3 py-1 rounded-lg text-xs font-medium text-[var(--color-secondary-dark)] bg-[var(--color-secondary)]/10 hover:bg-[var(--color-secondary)]/20 transition-all">
                              解鎖
                            </button>
                          )}
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[var(--color-text)]">{row.date.replace(/^\d{4}-/, "")}</span>
                            <button
                              onClick={() => handleQuickPause(row.date, row.scheduleId)}
                              className="px-2 py-0.5 rounded-lg text-[10px] font-medium text-[var(--color-danger)] bg-[var(--color-danger)]/10 hover:bg-[var(--color-danger)]/20 transition-all"
                            >
                              暫停
                            </button>
                          </div>
                          <div className="text-xs text-[var(--color-muted)]">週{DAY_NAMES[new Date(row.date + "T00:00:00").getDay()]}</div>
                        </td>
                        {serviceItems.map((item) => {
                          const a = row.assignments[item.display_order];
                          const name = a?.member_name || a?.custom_member_name;
                          return (
                            <td key={item.id} className="px-2 py-3 text-center">
                              <button
                                onClick={() => openAssignModal(row.scheduleId || 0, item.id, a ? { member_id: a.member_id, custom_name: a.custom_member_name } : null)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                                  name
                                    ? "bg-[var(--color-secondary)]/10 text-[var(--color-secondary-dark)] hover:bg-[var(--color-secondary)]/20"
                                    : "text-[var(--color-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5"
                                }`}
                              >
                                {name || <span className="opacity-40">—</span>}
                              </button>
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 text-center">
                          {editingRemarks?.scheduleId === row.scheduleId ? (
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="text"
                                value={editingRemarks.value}
                                onChange={(e) => setEditingRemarks({ ...editingRemarks, value: e.target.value })}
                                className="w-20 px-2 py-1.5 rounded-lg border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                                autoFocus
                                  onKeyDown={async (e) => {
                                    if (e.key === "Enter") {
                                      try {
                                        const token = localStorage.getItem("admin_token");
                                        const res = await fetch(`/api/admin/schedules/${row.scheduleId}/remarks`, {
                                          method: "PUT",
                                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                          body: JSON.stringify({ remarks: editingRemarks.value }),
                                        });
                                        if (!res.ok) throw new Error("儲存備註失敗");
                                        fetchData();
                                      } catch {
                                        setErrorMsg("儲存備註失敗");
                                      }
                                      setEditingRemarks(null);
                                    }
                                    if (e.key === "Escape") setEditingRemarks(null);
                                  }}
                              />
                              <button onClick={() => setEditingRemarks(null)} aria-label="取消編輯" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-danger)]">
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                                  <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => row.scheduleId && setEditingRemarks({ scheduleId: row.scheduleId, date: row.date, value: row.remarks || "" })}
                              className="text-xs text-[var(--color-muted)] hover:text-[var(--color-primary)] max-w-[80px] truncate inline-block transition-all"
                              title={row.remarks || ""}
                            >
                              {row.remarks || <span className="opacity-40">—</span>}
                            </button>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {lockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setLockModal(false)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-md shadow-modal animate-scaleIn">
            <h3 className="text-lg font-bold font-serif text-[var(--color-primary-dark)] mb-4">鎖定日期</h3>
            <Select
              value={lockDate}
              onChange={setLockDate}
              options={[
                { value: "", label: "選擇日期" },
                ...rows.map((r) => ({ value: r.date, label: r.date })),
              ]}
              className="w-full mb-3"
              triggerClassName="bg-[var(--color-input-bg)] border-[var(--color-glass-border)]"
            />
            <input
              type="text"
              value={lockMessage}
              onChange={(e) => setLockMessage(e.target.value)}
              placeholder="鎖定訊息（選填）"
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
            <div className="flex gap-3">
              <button onClick={() => setLockModal(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm border border-[var(--color-glass-border)] transition-all hover:bg-[var(--color-border-light)]">取消</button>
              <button onClick={handleLock} disabled={!lockDate} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[var(--color-danger)] to-[#B91C1C] shadow-sm transition-all disabled:opacity-50">確認鎖定</button>
            </div>
          </div>
        </div>
      )}

      {specialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSpecialModal(false)} />
          <div className="relative glass rounded-2xl p-6 w-full max-w-md shadow-modal animate-scaleIn">
            <h3 className="text-lg font-bold font-serif text-[var(--color-primary-dark)] mb-4">新增特殊日</h3>
            <input
              type="date"
              value={specialDate}
              onChange={(e) => setSpecialDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
            <input
              type="text"
              value={specialTitle}
              onChange={(e) => setSpecialTitle(e.target.value)}
              placeholder="活動名稱"
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
            <div className="flex gap-3">
              <button onClick={() => setSpecialModal(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm border border-[var(--color-glass-border)] transition-all hover:bg-[var(--color-border-light)]">取消</button>
              <button onClick={handleSpecialEvent} disabled={!specialDate || !specialTitle.trim()} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-dark)] shadow-sm transition-all disabled:opacity-50">確認</button>
            </div>
          </div>
        </div>
      )}

      {assignModal && (
        <div className="fixed inset-0 z-50 animate-fadeIn">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setAssignModal(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto rounded-t-3xl"
            style={{ background: "var(--color-modal-bg)" }}
          >
            <div className="sticky top-0 px-6 pt-4 pb-2 border-b border-[var(--color-glass-border)]" style={{ background: "var(--color-modal-bg)" }}>
              <div className="w-10 h-1 bg-[var(--color-glass-border)] rounded-full mx-auto mb-3" />
              <h3 className="text-lg font-bold font-serif text-[var(--color-primary-dark)]">指派服事人員</h3>
              <p className="text-sm text-[var(--color-muted)]">{serviceItems.find((i) => i.id === assignItemId)?.name}</p>
            </div>
            <div className="px-6 py-4">
              <button
                onClick={() => handleAssign(null)}
                className="w-full px-4 py-3 rounded-xl text-left text-sm text-[var(--color-danger)] hover:bg-[var(--color-danger)]/5 transition-all mb-2"
              >
                清除指派
              </button>
              <div className="space-y-1">
                {members.filter((m) => m.is_active === 1).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleAssign(m.id)}
                    className={`w-full px-4 py-3 rounded-xl text-left text-sm transition-all ${
                      assignCurrentValue?.member_id === m.id
                        ? "bg-[var(--color-secondary)]/15 font-medium text-[var(--color-secondary-dark)]"
                        : "hover:bg-[var(--color-hover-bg)]"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        {m.name.charAt(0)}
                      </div>
                      {m.name}
                      {assignCurrentValue?.member_id === m.id && (
                        <svg className="w-4 h-4 ml-auto text-[var(--color-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-3 border-t border-[var(--color-glass-border)] pt-3">
                {!showCustomInput ? (
                  <button
                    onClick={() => setShowCustomInput(true)}
                    className="w-full px-4 py-3 rounded-xl text-left text-sm text-[var(--color-accent)] hover:bg-[var(--color-hover-bg)] transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      其他（非成員）
                    </span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="輸入姓名..."
                      maxLength={50}
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={() => { setShowCustomInput(false); setCustomName(""); }} className="flex-1 px-4 py-2.5 rounded-xl text-sm border border-[var(--color-glass-border)] transition-all hover:bg-[var(--color-border-light)]">取消</button>
                      <button onClick={() => { if (customName.trim()) handleAssign(null, customName.trim()); }} disabled={!customName.trim()} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] shadow-sm transition-all disabled:opacity-50">確認</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
