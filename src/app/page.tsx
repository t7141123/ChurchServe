"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/lib/components/ui/Card";
import { Badge } from "@/lib/components/ui/Badge";
import { Button } from "@/lib/components/ui/Button";

interface Group {
  id: number;
  name: string;
}

interface ServiceItem {
  id: number;
  name: string;
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
  assignments: Record<number, { member_id: number | null; custom_member_name: string | null; member_name: string | null; id: number }>;
}

interface Member {
  id: number;
  name: string;
}

function getSaturdaysOfMonth(year: number, month: number): string[] {
  const dates: string[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    if (date.getDay() === 6) {
      dates.push(
        `${year}-${String(month + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
      );
    }
    date.setDate(date.getDate() + 1);
  }
  return dates;
}

const DAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getMemberColor(name: string): string {
  const colors = [
    "bg-emerald-100 text-emerald-700 border-emerald-200",
    "bg-sky-100 text-sky-700 border-sky-200",
    "bg-violet-100 text-violet-700 border-violet-200",
    "bg-rose-100 text-rose-700 border-rose-200",
    "bg-amber-100 text-amber-700 border-amber-200",
    "bg-teal-100 text-teal-700 border-teal-200",
    "bg-indigo-100 text-indigo-700 border-indigo-200",
    "bg-pink-100 text-pink-700 border-pink-200",
    "bg-lime-100 text-lime-700 border-lime-200",
    "bg-cyan-100 text-cyan-700 border-cyan-200",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function SkeletonCard() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-4 space-y-3">
          <div className="animate-shimmer h-5 w-32 rounded-lg" />
          <div className="animate-shimmer h-4 w-full rounded-lg" />
          <div className="animate-shimmer h-4 w-3/4 rounded-lg" />
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

  const [modalOpen, setModalOpen] = useState(false);
  const [modalScheduleId, setModalScheduleId] = useState<number | null>(null);
  const [modalItemId, setModalItemId] = useState<number | null>(null);
  const [modalCurrentValue, setModalCurrentValue] = useState<{ member_id: number | null; custom_name: string | null } | null>(null);
  const [customName, setCustomName] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data.length > 0) {
          setGroups(d.data);
          setSelectedGroup(d.data[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchSchedules = useCallback(async () => {
    if (!selectedGroup) return;
    const ym = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
    const [schedRes, itemRes, memberRes] = await Promise.all([
      fetch(`/api/schedules/${selectedGroup}/${ym}`),
      fetch(`/api/groups/${selectedGroup}/service-items`),
      fetch(`/api/groups/${selectedGroup}/members`),
    ]);
    const schedData = await schedRes.json();
    const itemData = await itemRes.json();
    const memberData = await memberRes.json();

    if (itemData.success) setServiceItems(itemData.data);
    if (memberData.success) setMembers(memberData.data.filter((m: Member & { is_active: number }) => m.is_active === 1));

    const dates = getSaturdaysOfMonth(currentYear, currentMonth);
    const apiSchedules = schedData.success ? schedData.data : [];

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
        assignments: assignmentsMap,
      };
    });

    setSchedules(enriched);
  }, [selectedGroup, currentYear, currentMonth]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const openModal = (scheduleId: number, itemId: number, currentValue: { member_id: number | null; custom_name: string | null } | null) => {
    setModalScheduleId(scheduleId);
    setModalItemId(itemId);
    setModalCurrentValue(currentValue);
    setCustomName("");
    setShowCustomInput(false);
    setModalOpen(true);
  };

  const handleSelectMember = async (memberId: number | null, customNameStr?: string) => {
    if (modalScheduleId === null || modalItemId === null) return;

    const body: { member_id?: number | null; custom_member_name?: string | null } = {};
    if (memberId) {
      body.member_id = memberId;
    } else if (customNameStr) {
      body.custom_member_name = customNameStr;
    } else {
      body.member_id = null;
      body.custom_member_name = null;
    }

    const res = await fetch(`/api/assignments/${modalScheduleId}/${modalItemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setModalOpen(false);
      fetchSchedules();
    } else {
      const data = await res.json();
      alert(data.error || "操作失敗");
    }
  };

  const currentLabel = `${currentYear} 年 ${currentMonth} 月`;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-[var(--color-glass-border)] shadow-[var(--shadow-glass)]">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold font-serif text-[var(--color-primary)] flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg bg-[var(--color-primary)] text-white flex items-center justify-center text-sm">
                ⛪
              </span>
              ChurchServe
            </h1>
            <a
              href="/admin/login"
              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--color-border-light)]"
            >
              管理後台
            </a>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative w-full sm:w-56">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                <path d="M9 22V12h6v10" />
              </svg>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(Number(e.target.value))}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-base appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted)] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>

            <div className="flex items-center gap-2 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] px-2 py-1.5">
              <button
                onClick={() => {
                  if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(currentYear - 1); }
                  else { setCurrentMonth(currentMonth - 1); }
                }}
                className="w-9 h-9 rounded-lg hover:bg-[var(--color-border-light)] flex items-center justify-center text-[var(--color-text-light)] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <span className="text-base font-medium min-w-[130px] text-center text-[var(--color-text)]">
                {currentLabel}
              </span>
              <button
                onClick={() => {
                  if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(currentYear + 1); }
                  else { setCurrentMonth(currentMonth + 1); }
                }}
                className="w-9 h-9 rounded-lg hover:bg-[var(--color-border-light)] flex items-center justify-center text-[var(--color-text-light)] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Schedule Content */}
      <main className="max-w-6xl mx-auto w-full px-4 py-6 flex-1">
        {loading ? (
          <SkeletonCard />
        ) : schedules.length === 0 ? (
          <div className="text-center py-16 page-enter">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-border-light)] flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <p className="text-lg text-[var(--color-muted)]">本月尚無排班資料</p>
          </div>
        ) : (
          <div className="space-y-4 page-enter">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-[var(--color-border)] shadow-[var(--shadow-card)]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)]">
                    <th className="px-5 py-4 text-left text-white font-medium text-base whitespace-nowrap">
                      日期
                    </th>
                    {serviceItems.map((item) => (
                      <th key={item.id} className="px-3 py-4 text-center text-white font-medium text-sm">
                        {item.name}
                      </th>
                    ))}
                    <th className="px-4 py-4 text-center text-white font-medium text-sm whitespace-nowrap">
                      備註
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule, idx) => (
                    <tr
                      key={schedule.date}
                      className={
                        idx % 2 === 0
                          ? "bg-[var(--color-surface)] transition-colors"
                          : "bg-[var(--color-border-light)] transition-colors"
                      }
                    >
                      <td className="px-5 py-4 font-semibold whitespace-nowrap border-r border-[var(--color-border)] text-[var(--color-text)]">
                        <span className="text-sm">{formatDate(schedule.date)}</span>
                        <span className="text-[var(--color-muted)] text-xs ml-1.5">
                          ({DAY_NAMES[new Date(schedule.date + "T00:00:00").getDay()]})
                        </span>
                        {schedule.isSpecialEvent && (
                          <span className="ml-2 inline-block px-1.5 py-0.5 rounded text-xs bg-[var(--color-accent)]/10 text-[var(--color-accent-dark)] font-medium">
                            {schedule.eventTitle}
                          </span>
                        )}
                      </td>
                      {serviceItems.map((item) => {
                        const assignment = schedule.assignments[item.display_order];
                        const name = assignment?.member_name || assignment?.custom_member_name;

                        if (schedule.isLocked) {
                          return (
                            <td key={item.id} className="px-3 py-4 text-center border-r border-[var(--color-border)]">
                              <span className="text-[var(--color-muted)]">🔒</span>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={item.id}
                            className="px-3 py-4 text-center border-r border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-accent)]/5 transition-colors"
                            onClick={() =>
                              openModal(schedule.scheduleId || 0, item.id, assignment ? {
                                member_id: assignment.member_id,
                                custom_name: assignment.custom_member_name,
                              } : null)
                            }
                          >
                            {name ? (
                              <span className={`inline-block px-2.5 py-1 rounded-lg text-sm font-medium border ${getMemberColor(name)}`}>
                                {name}
                              </span>
                            ) : (
                              <span className="text-[var(--color-muted)] text-sm hover:text-[var(--color-accent)] transition-colors">
                                點擊登記
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-4 text-center text-sm">
                        {schedule.isLocked ? (
                          <span className="text-[var(--color-danger)]">{schedule.lockMessage || "暫停"}</span>
                        ) : schedule.isSpecialEvent ? (
                          <span className="text-[var(--color-accent)]">{schedule.eventTitle}</span>
                        ) : (
                          <span className="text-[var(--color-muted)]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {schedules.map((schedule) => (
                <Card key={schedule.date} variant="default" padding="none" className="overflow-hidden">
                  <div className="px-4 py-3.5 bg-gradient-to-r from-[var(--color-primary)]/5 to-transparent border-b border-[var(--color-border)]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--color-primary)]">
                          {formatDate(schedule.date)}
                        </span>
                        <span className="text-xs text-[var(--color-muted)]">
                          ({DAY_NAMES[new Date(schedule.date + "T00:00:00").getDay()]})
                        </span>
                      </div>
                      {schedule.isLocked ? (
                        <Badge variant="danger">{schedule.lockMessage || "暫停聚會"}</Badge>
                      ) : schedule.isSpecialEvent ? (
                        <Badge variant="accent">{schedule.eventTitle || "特殊活動"}</Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="divide-y divide-[var(--color-border-light)]">
                    {serviceItems.map((item) => {
                      const assignment = schedule.assignments[item.display_order];
                      const name = assignment?.member_name || assignment?.custom_member_name;

                      return (
                        <div
                          key={item.id}
                          className={`px-4 py-3.5 flex items-center justify-between ${
                            schedule.isLocked ? "opacity-50" : "cursor-pointer active:bg-[var(--color-border-light)]"
                          }`}
                          onClick={() => {
                            if (!schedule.isLocked) {
                              openModal(schedule.scheduleId || 0, item.id, assignment ? {
                                member_id: assignment.member_id,
                                custom_name: assignment.custom_member_name,
                              } : null);
                            }
                          }}
                        >
                          <span className="text-sm font-medium text-[var(--color-text-light)]">{item.name}</span>
                          {name ? (
                            <span className={`text-sm font-medium px-3 py-1 rounded-full border ${getMemberColor(name)}`}>
                              {name}
                            </span>
                          ) : (
                            <span className="text-sm text-[var(--color-muted)]">
                              {schedule.isLocked ? "🔒" : "登記"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Sheet Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in" onClick={() => setModalOpen(false)} />
          <div className="relative w-full bg-[var(--color-surface)] sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-[var(--shadow-modal)] animate-slide-up overflow-hidden">
            <div className="sticky top-0 bg-[var(--color-surface)] border-b border-[var(--color-border)] z-10">
              <div className="flex items-center justify-between px-6 pt-5 pb-4">
                <div>
                  <h3 className="text-lg font-bold font-serif text-[var(--color-text)]">選擇服事人員</h3>
                  <p className="text-sm text-[var(--color-muted)] mt-0.5">
                    {serviceItems.find((i) => i.id === modalItemId)?.name}
                  </p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--color-border-light)] transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
              <button
                onClick={() => handleSelectMember(null)}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left hover:bg-[var(--color-border-light)] transition-colors mb-2 text-[var(--color-danger)]"
              >
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                <span className="text-sm font-medium">清除此欄位</span>
              </button>

              <div className="space-y-1">
                {members.map((member) => {
                  const isSelected = modalCurrentValue?.member_id === member.id;
                  return (
                    <button
                      key={member.id}
                      onClick={() => handleSelectMember(member.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-all ${
                        isSelected
                          ? "bg-[var(--color-secondary)]/10 text-[var(--color-secondary-dark)] font-medium ring-1 ring-[var(--color-secondary)]/30"
                          : "hover:bg-[var(--color-border-light)] text-[var(--color-text)]"
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        isSelected
                          ? "bg-[var(--color-secondary)] text-white"
                          : "bg-[var(--color-border-light)] text-[var(--color-text-light)]"
                      }`}>
                        {member.name.charAt(0)}
                      </span>
                      <span>{member.name}</span>
                      {isSelected && (
                        <svg className="ml-auto w-4 h-4 text-[var(--color-secondary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 border-t border-[var(--color-border)] pt-4">
                {!showCustomInput ? (
                  <button
                    onClick={() => setShowCustomInput(true)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left hover:bg-[var(--color-border-light)] transition-colors text-[var(--color-accent)]"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    <span className="text-sm font-medium">自行輸入姓名</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="輸入姓名..."
                        maxLength={50}
                        className="w-full pl-4 pr-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder-[var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-all"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="md"
                        className="flex-1"
                        onClick={() => { setShowCustomInput(false); setCustomName(""); }}
                      >
                        取消
                      </Button>
                      <Button
                        variant="primary"
                        size="md"
                        className="flex-1"
                        disabled={!customName.trim()}
                        onClick={() => { if (customName.trim()) handleSelectMember(null, customName.trim()); }}
                      >
                        確認
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto py-5 text-center border-t border-[var(--color-border)]">
        <p className="text-sm text-[var(--color-muted)]">ChurchServe — 開源教會小組服事排班系統</p>
      </footer>
    </div>
  );
}
