"use client";

import { useState, useEffect } from "react";

interface Group {
  id: number;
  name: string;
}

export default function ScheduleListPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/groups")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setGroups(d.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-8 text-[var(--color-muted)]">載入中...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">排班管理</h2>
      <div className="space-y-3">
        {groups.map((g) => (
          <a
            key={g.id}
            href={`/admin/schedule/${g.id}`}
            className="block bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-4 hover:shadow-md transition-shadow"
          >
            <span className="font-medium text-[var(--color-primary)]">{g.name}</span>
            <span className="text-[var(--color-muted)] text-sm ml-2">→</span>
          </a>
        ))}
      </div>
    </div>
  );
}
