"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

interface ServiceItem {
  id: number;
  name: string;
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
  assignments: Record<number, { member_id: number | null; custom_member_name: string | null; member_name: string | null; id: number }>;
}

function getSaturdaysOfMonth(year: number, month: number): string[] {
  const dates: string[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    if (d.getDay() === 6) {
      dates.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

const DAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

export default function SchedulePage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const [groupName, setGroupName] = useState("");
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [lockModal, setLockModal] = useState(false);
  const [lockDate, setLockDate] = useState("");
  const [lockMessage, setLockMessage] = useState("");
  const [specialModal, setSpecialModal] = useState(false);
  const [specialDate, setSpecialDate] = useState("");
  const [specialTitle, setSpecialTitle] = useState("");

  const [assignModal, setAssignModal] = useState(false);
  const [assignScheduleId, setAssignScheduleId] = useState<number | null>(null);
  const [assignItemId, setAssignItemId] = useState<number | null>(null);
  const [assignCurrentValue, setAssignCurrentValue] = useState<{ member_id: number | null; custom_name: string | null } | null>(null);
  const [customName, setCustomName] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const fetchData = useCallback(async () => {
    const ym = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;
    const [groupRes, schedRes, itemRes, memberRes] = await Promise.all([
      fetch(`/api/groups/${groupId}`),
      fetch(`/api/schedules/${groupId}/${ym}`),
      fetch(`/api/groups/${groupId}/service-items`),
      fetch(`/api/groups/${groupId}/members`),
    ]);
    const groupData = await groupRes.json();
    const schedData = await schedRes.json();
    const itemData = await itemRes.json();
    const memberData = await memberRes.json();

    if (groupData.success) setGroupName(groupData.data.name);
    if (itemData.success) setServiceItems(itemData.data);
    if (memberData.success) setMembers(memberData.data);

    const dates = getSaturdaysOfMonth(currentYear, currentMonth);
    const apiSchedules = schedData.success ? schedData.data : [];

    const enriched: ScheduleRow[] = dates.map((dateStr) => {
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
      return {
        date: dateStr,
        scheduleId: existing?.id || null,
        isSpecialEvent: existing?.is_special_event || 0,
        eventTitle: existing?.event_title || null,
        isLocked: existing?.is_locked || 0,
        lockMessage: existing?.lock_message || null,
        assignments: assignmentsMap,
      };
    });

    setRows(enriched);
    setLoading(false);
  }, [groupId, currentYear, currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleLock = async () => {
    if (!lockDate) return;
    let sched = rows.find((r) => r.date === lockDate);
    if (!sched?.scheduleId) {
      await fetch("/api/schedules/special", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: Number(groupId), date: lockDate, event_title: lockMessage || "暫停聚會" }),
      });
      fetchData();
      setLockModal(false);
      return;
    }
    const token = localStorage.getItem("admin_token");
    await fetch(`/api/admin/schedules/${sched.scheduleId}/lock`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_locked: 1, lock_message: lockMessage }),
    });
    setLockModal(false);
    fetchData();
  };

  const handleUnlock = async (scheduleId: number) => {
    const token = localStorage.getItem("admin_token");
    await fetch(`/api/admin/schedules/${scheduleId}/lock`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_locked: 0, lock_message: null }),
    });
    fetchData();
  };

  const handleSpecialEvent = async () => {
    if (!specialDate || !specialTitle.trim()) return;
    await fetch("/api/schedules/special", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_id: Number(groupId), date: specialDate, event_title: specialTitle.trim() }),
    });
    setSpecialModal(false);
    setSpecialTitle("");
    fetchData();
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
    const body: { member_id?: number | null; custom_member_name?: string | null } = {};
    if (memberId) body.member_id = memberId;
    else if (customNameVal) body.custom_member_name = customNameVal;
    else body.member_id = null;

    const token = localStorage.getItem("admin_token");
    await fetch(`/api/admin/assignments/0`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...body, schedule_id: assignScheduleId, service_item_id: assignItemId }),
    });
    setAssignModal(false);
    fetchData();
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <a href="/admin" className="text-[var(--color-muted)] hover:text-[var(--color-primary)]">← 返回</a>
        <h2 className="text-xl font-bold">{groupName} - 排班管理</h2>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setSpecialModal(true)} className="px-4 py-2 rounded-xl bg-[var(--color-accent)] text-white text-sm">
          + 特殊日
        </button>
        <button onClick={() => { setLockDate(""); setLockMessage(""); setLockModal(true); }} className="px-4 py-2 rounded-xl bg-[var(--color-danger)] text-white text-sm">
          🔒 鎖定日期
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => { if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(currentYear - 1); } else setCurrentMonth(currentMonth - 1); }} className="px-3 py-2 rounded-lg bg-[var(--color-border-light)]">◀</button>
        <span className="font-medium min-w-[100px] text-center">{currentYear} 年 {currentMonth} 月</span>
        <button onClick={() => { if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(currentYear + 1); } else setCurrentMonth(currentMonth + 1); }} className="px-3 py-2 rounded-lg bg-[var(--color-border-light)]">▶</button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-[var(--color-muted)]">載入中...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8 text-[var(--color-muted)]">本月無排班</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-[var(--color-primary)] text-white">
                <th className="px-3 py-2 text-left">日期</th>
                {serviceItems.map((item) => (
                  <th key={item.id} className="px-2 py-2 text-center">{item.name}</th>
                ))}
                <th className="px-3 py-2 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.date} className={idx % 2 === 0 ? "bg-[var(--color-surface)]" : "bg-[var(--color-border-light)]"}>
                  <td className="px-3 py-2 font-medium whitespace-nowrap">
                    {row.date} ({DAY_NAMES[new Date(row.date + "T00:00:00").getDay()]})
                  </td>
                  {serviceItems.map((item) => {
                    const a = row.assignments[item.display_order];
                    const name = a?.member_name || a?.custom_member_name;
                    return (
                      <td key={item.id} className="px-2 py-2 text-center">
                        {row.isLocked ? (
                          <span className="text-[var(--color-muted)]">🔒</span>
                        ) : (
                          <button
                            onClick={() => openAssignModal(row.scheduleId || 0, item.id, a ? { member_id: a.member_id, custom_name: a.custom_member_name } : null)}
                            className={`px-2 py-1 rounded text-xs ${name ? "bg-[var(--color-secondary)] bg-opacity-15 text-[var(--color-secondary-dark)]" : "text-[var(--color-muted)] hover:text-[var(--color-primary)]"}`}
                          >
                            {name || "—"}
                          </button>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center">
                    {row.isLocked ? (
                      <button onClick={() => row.scheduleId && handleUnlock(row.scheduleId)} className="text-xs text-[var(--color-secondary)] hover:underline">
                        解鎖
                      </button>
                    ) : row.scheduleId ? (
                      <span className="text-xs text-[var(--color-muted)]">已建立</span>
                    ) : (
                      <span className="text-xs text-[var(--color-muted)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Lock Modal */}
      {lockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-40" onClick={() => setLockModal(false)} />
          <div className="relative bg-[var(--color-surface)] rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">鎖定日期</h3>
            <select value={lockDate} onChange={(e) => setLockDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] mb-3">
              <option value="">選擇日期</option>
              {rows.map((r) => <option key={r.date} value={r.date}>{r.date}</option>)}
            </select>
            <input type="text" value={lockMessage} onChange={(e) => setLockMessage(e.target.value)} placeholder="鎖定訊息（選填）" className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setLockModal(false)} className="flex-1 px-4 py-3 rounded-xl border border-[var(--color-border)]">取消</button>
              <button onClick={handleLock} disabled={!lockDate} className="flex-1 px-4 py-3 rounded-xl bg-[var(--color-danger)] text-white disabled:opacity-50">確認鎖定</button>
            </div>
          </div>
        </div>
      )}

      {/* Special Event Modal */}
      {specialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black bg-opacity-40" onClick={() => setSpecialModal(false)} />
          <div className="relative bg-[var(--color-surface)] rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">新增特殊日</h3>
            <input type="date" value={specialDate} onChange={(e) => setSpecialDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] mb-3" />
            <input type="text" value={specialTitle} onChange={(e) => setSpecialTitle(e.target.value)} placeholder="活動名稱" className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)] mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setSpecialModal(false)} className="flex-1 px-4 py-3 rounded-xl border border-[var(--color-border)]">取消</button>
              <button onClick={handleSpecialEvent} disabled={!specialDate || !specialTitle.trim()} className="flex-1 px-4 py-3 rounded-xl bg-[var(--color-accent)] text-white disabled:opacity-50">確認</button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black bg-opacity-40" onClick={() => setAssignModal(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-[var(--color-surface)] rounded-t-3xl max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-[var(--color-surface)] px-6 pt-4 pb-2 border-b border-[var(--color-border)]">
              <div className="w-10 h-1 bg-[var(--color-border)] rounded-full mx-auto mb-3" />
              <h3 className="text-lg font-bold">指派服事人員</h3>
              <p className="text-sm text-[var(--color-muted)]">{serviceItems.find((i) => i.id === assignItemId)?.name}</p>
            </div>
            <div className="px-6 py-4">
              <button onClick={() => handleAssign(null)} className="w-full px-4 py-3 rounded-xl text-left text-[var(--color-danger)] hover:bg-[var(--color-border-light)] mb-2">清除</button>
              <div className="space-y-1">
                {members.filter((m) => m.is_active === 1).map((m) => (
                  <button key={m.id} onClick={() => handleAssign(m.id)} className={`w-full px-4 py-3 rounded-xl text-left transition-colors ${assignCurrentValue?.member_id === m.id ? "bg-[var(--color-secondary)] bg-opacity-15 font-medium" : "hover:bg-[var(--color-border-light)]"}`}>
                    {m.name}
                  </button>
                ))}
              </div>
              <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                {!showCustomInput ? (
                  <button onClick={() => setShowCustomInput(true)} className="w-full px-4 py-3 rounded-xl text-left text-[var(--color-accent)] hover:bg-[var(--color-border-light)]">+ 其他</button>
                ) : (
                  <div className="space-y-2">
                    <input type="text" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="輸入姓名..." maxLength={50} className="w-full px-4 py-3 rounded-xl border border-[var(--color-border)]" autoFocus />
                    <div className="flex gap-2">
                      <button onClick={() => { setShowCustomInput(false); setCustomName(""); }} className="flex-1 px-4 py-3 rounded-xl border border-[var(--color-border)]">取消</button>
                      <button onClick={() => { if (customName.trim()) handleAssign(null, customName.trim()); }} disabled={!customName.trim()} className="flex-1 px-4 py-3 rounded-xl bg-[var(--color-primary)] text-white disabled:opacity-50">確認</button>
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
