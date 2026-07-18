"use client";

import { useState, useEffect } from "react";

interface Group {
  id: number;
  name: string;
  created_at: string;
}

export default function AdminDashboard() {
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

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">管理後台首頁</h2>

      {loading ? (
        <div className="text-center py-8 text-[var(--color-muted)]">載入中...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="text-lg font-bold text-[var(--color-primary)] mb-4">{group.name}</h3>
              <div className="space-y-2">
                <a
                  href={`/admin/groups/${group.id}/members`}
                  className="block px-4 py-2 rounded-xl bg-[var(--color-secondary)] bg-opacity-10 text-[var(--color-secondary-dark)] hover:bg-opacity-20 transition-colors text-sm"
                >
                  👥 成員管理
                </a>
                <a
                  href={`/admin/groups/${group.id}/service-items`}
                  className="block px-4 py-2 rounded-xl bg-[var(--color-accent)] bg-opacity-10 text-[var(--color-accent-dark)] hover:bg-opacity-20 transition-colors text-sm"
                >
                  📋 服事項目管理
                </a>
                <a
                  href={`/admin/schedule/${group.id}`}
                  className="block px-4 py-2 rounded-xl bg-[var(--color-primary)] bg-opacity-10 text-[var(--color-primary-dark)] hover:bg-opacity-20 transition-colors text-sm"
                >
                  📅 排班管理
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
