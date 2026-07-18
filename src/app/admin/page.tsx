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
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(""), 3000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/groups");
        if (!res.ok) throw new Error("載入失敗");
        const d = await res.json();
        setGroups(d);
      } catch {
        setErrorMsg("載入小組失敗");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <>
      {/* Header */}
      <div className="mb-8 animate-fadeIn">
        <h1 className="text-2xl font-bold font-serif text-[var(--color-primary-dark)] mb-1">儀表板</h1>
        <p className="text-sm text-[var(--color-muted)]">管理小組資訊、服事項目與排班</p>
      </div>

      {errorMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-[var(--color-danger)]/10 text-[var(--color-danger)] border border-[var(--color-danger)]/20 animate-fadeIn" role="alert">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl p-6" style={{ background: "var(--color-surface)", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <div className="h-5 w-24 rounded bg-[var(--color-border-light)] animate-pulse mb-4" />
              <div className="space-y-2.5">
                <div className="h-10 rounded-xl bg-[var(--color-border-light)] animate-pulse" />
                <div className="h-10 rounded-xl bg-[var(--color-border-light)] animate-pulse" />
                <div className="h-10 rounded-xl bg-[var(--color-border-light)] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 animate-fadeIn">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-border-light)] mb-4">
            <svg className="w-8 h-8 text-[var(--color-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <p className="text-sm text-[var(--color-muted)]">尚無任何小組</p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group, idx) => (
            <div
              key={group.id}
              className="glass rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-elevated hover:translate-y-[-2px] animate-slideUp"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              {/* Color accent bar */}
              <div className="h-1.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)]" />

              <div className="p-6">
                <h2 className="text-lg font-bold font-serif text-[var(--color-primary-dark)] mb-4">
                  {group.name}
                </h2>
                <div className="space-y-2">
                  <a
                    href={`/admin/groups/members?id=${group.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--color-secondary-dark)] bg-[var(--color-secondary)]/8 hover:bg-[var(--color-secondary)]/15 transition-all"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                    </svg>
                    成員管理
                  </a>
                  <a
                    href={`/admin/groups/service-items?id=${group.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--color-accent-dark)] bg-[var(--color-accent)]/8 hover:bg-[var(--color-accent)]/15 transition-all"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                    服事項目管理
                  </a>
                  <a
                    href={`/admin/schedule/detail?groupId=${group.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--color-primary-dark)] bg-[var(--color-primary)]/8 hover:bg-[var(--color-primary)]/15 transition-all"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    排班管理
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
