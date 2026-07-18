"use client";

import { useState, useEffect, useCallback } from "react";

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
  return `${d.getMonth() + 1}/${d.getDate()} (${DAY_NAMES[d.getDay()]})`;
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

  const handleSelectMember = async (memberId: number | null, customName?: string) => {
    if (modalScheduleId === null || modalItemId === null) return;

    const body: { member_id?: number | null; custom_member_name?: string | null } = {};
    if (memberId) {
      body.member_id = memberId;
    } else if (customName) {
      body.custom_member_name = customName;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-[var(--color-muted)]">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--color-surface)] border-b border-[var(--color-border)] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-[var(--color-primary)] flex items-center gap-2">
              <span className="text-2xl">🕊️</span>
              ChurchServe
            </h1>
            <a
              href="/admin/login"
              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-primary)]"
            >
              管理後台
            </a>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            {/* Group Selector */}
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(Number(e.target.value))}
              className="w-full sm:w-auto px-4 py-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>

            {/* Month Navigator */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (currentMonth === 1) {
                    setCurrentMonth(12);
                    setCurrentYear(currentYear - 1);
                  } else {
                    setCurrentMonth(currentMonth - 1);
                  }
                }}
                className="w-10 h-10 rounded-lg bg-[var(--color-border-light)] hover:bg-[var(--color-border)] flex items-center justify-center text-lg"
              >
                ◀
              </button>
              <span className="text-base font-medium min-w-[120px] text-center">
                {currentYear} 年 {currentMonth} 月
              </span>
              <button
                onClick={() => {
                  if (currentMonth === 12) {
                    setCurrentMonth(1);
                    setCurrentYear(currentYear + 1);
                  } else {
                    setCurrentMonth(currentMonth + 1);
                  }
                }}
                className="w-10 h-10 rounded-lg bg-[var(--color-border-light)] hover:bg-[var(--color-border)] flex items-center justify-center text-lg"
              >
                ▶
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Schedule Grid */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {schedules.length === 0 ? (
          <div className="text-center py-12 text-[var(--color-muted)]">
            <p className="text-lg">本月尚無排班資料</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[var(--color-primary)] text-white">
                    <th className="px-4 py-3 text-left rounded-tl-lg">日期</th>
                    {serviceItems.map((item) => (
                      <th key={item.id} className="px-3 py-3 text-center text-sm font-medium">
                        {item.name}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center rounded-tr-lg">備註</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule, idx) => (
                    <tr
                      key={schedule.date}
                      className={idx % 2 === 0 ? "bg-[var(--color-surface)]" : "bg-[var(--color-border-light)]"}
                    >
                      <td className="px-4 py-3 font-medium whitespace-nowrap border-r border-[var(--color-border)]">
                        {formatDate(schedule.date)}
                      </td>
                      {serviceItems.map((item) => {
                        const assignment = schedule.assignments[item.display_order];
                        const name = assignment?.member_name || assignment?.custom_member_name;

                        if (schedule.isLocked) {
                          return (
                            <td key={item.id} className="px-3 py-3 text-center border-r border-[var(--color-border)]">
                              <span className="text-[var(--color-muted)] text-sm">🔒</span>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={item.id}
                            className="px-3 py-3 text-center border-r border-[var(--color-border)] cursor-pointer hover:bg-[var(--color-accent)] hover:bg-opacity-10 transition-colors"
                            onClick={() =>
                              openModal(schedule.scheduleId || 0, item.id, assignment ? {
                                member_id: assignment.member_id,
                                custom_name: assignment.custom_member_name,
                              } : null)
                            }
                          >
                            {name ? (
                              <span className="inline-block px-2 py-1 rounded-lg bg-[var(--color-secondary)] bg-opacity-15 text-[var(--color-secondary-dark)] text-sm font-medium">
                                {name}
                              </span>
                            ) : (
                              <span className="text-[var(--color-muted)] text-sm hover:text-[var(--color-accent)]">
                                點擊登記
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center text-sm text-[var(--color-muted)]">
                        {schedule.isLocked ? (
                          <span className="text-[var(--color-danger)]">{schedule.lockMessage}</span>
                        ) : schedule.isSpecialEvent ? (
                          <span className="text-[var(--color-accent)]">{schedule.eventTitle}</span>
                        ) : (
                          "-"
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
                <div
                  key={schedule.date}
                  className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm"
                >
                  <div className="px-4 py-3 bg-[var(--color-primary)] bg-opacity-10 border-b border-[var(--color-border)]">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--color-primary)]">
                        {formatDate(schedule.date)}
                      </span>
                      {schedule.isLocked ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-danger)] bg-opacity-15 text-[var(--color-danger)]">
                          🔒 {schedule.lockMessage || "已鎖定"}
                        </span>
                      ) : schedule.isSpecialEvent ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-accent)] bg-opacity-15 text-[var(--color-accent)]">
                          {schedule.eventTitle}
                        </span>
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
                          className={`px-4 py-3 flex items-center justify-between ${
                            schedule.isLocked ? "opacity-60" : "active:bg-[var(--color-border-light)]"
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
                          <span className="text-sm text-[var(--color-text-light)]">{item.name}</span>
                          {name ? (
                            <span className="text-sm font-medium text-[var(--color-secondary-dark)] bg-[var(--color-secondary)] bg-opacity-15 px-3 py-1 rounded-full">
                              {name}
                            </span>
                          ) : (
                            <span className="text-sm text-[var(--color-muted)]">
                              {schedule.isLocked ? "🔒" : "點擊登記"}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom Sheet Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black bg-opacity-40"
            onClick={() => setModalOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-[var(--color-surface)] rounded-t-3xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-[var(--color-surface)] px-6 pt-4 pb-2 border-b border-[var(--color-border)]">
              <div className="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-3"></div>
              <h3 className="text-lg font-bold text-[var(--color-text)]">選擇服事人員</h3>
              <p className="text-sm text-[var(--color-muted)] mt-1">
                {serviceItems.find((i) => i.id === modalItemId)?.name}
              </p>
            </div>
            <div className="px-6 py-4">
              {/* Clear option */}
              <button
                onClick={() => handleSelectMember(null)}
                className="w-full px-4 py-3 rounded-xl text-left hover:bg-[var(--color-border-light)] transition-colors mb-2 text-[var(--color-danger)]"
              >
                清除此欄位
              </button>

              {/* Member list */}
              <div className="space-y-1">
                {members.map((member) => {
                  const isSelected = modalCurrentValue?.member_id === member.id;
                  return (
                    <button
                      key={member.id}
                      onClick={() => handleSelectMember(member.id)}
                      className={`w-full px-4 py-3 rounded-xl text-left transition-colors ${
                        isSelected
                          ? "bg-[var(--color-secondary)] bg-opacity-15 text-[var(--color-secondary-dark)] font-medium"
                          : "hover:bg-[var(--color-border-light)]"
                      }`}
                    >
                      {member.name}
                    </button>
                  );
                })}
              </div>

              {/* Custom input */}
              <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                {!showCustomInput ? (
                  <button
                    onClick={() => setShowCustomInput(true)}
                    className="w-full px-4 py-3 rounded-xl text-left text-[var(--color-accent)] hover:bg-[var(--color-border-light)] transition-colors"
                  >
                    + 其他（自行輸入姓名）
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="輸入姓名..."
                      maxLength={50}
                      className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-base"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowCustomInput(false);
                          setCustomName("");
                        }}
                        className="flex-1 px-4 py-3 rounded-xl border border-[var(--color-border)] text-[var(--color-muted)]"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => {
                          if (customName.trim()) {
                            handleSelectMember(null, customName.trim());
                          }
                        }}
                        disabled={!customName.trim()}
                        className="flex-1 px-4 py-3 rounded-xl bg-[var(--color-primary)] text-white disabled:opacity-50"
                      >
                        確認
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto py-4 text-center text-sm text-[var(--color-muted)] border-t border-[var(--color-border)]">
        ChurchServe - 開源教會小組服事報名系統
      </footer>
    </div>
  );
}
