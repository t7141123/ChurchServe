"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Group } from "@/types";

function authHeaders(): Record<string, string> {
  const t = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
  return t ? { Authorization: `Bearer ${t}` } : {};
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
        const res = await fetch("/api/admin/groups", { headers: authHeaders() });
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
      <div className="mb-8 animate-fadeIn">
        <h1 className="text-2xl font-bold font-serif text-[var(--color-primary)] mb-1">儀表板</h1>
        <p className="text-sm text-[var(--color-muted)]">管理小組資訊、服事項目與排班</p>
      </div>

      {errorMsg && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm bg-[var(--color-danger-soft)] text-[var(--color-danger)] border border-[var(--color-danger)]/20 animate-fadeIn" role="alert">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl p-6 bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-card)]">
              <div className="h-5 w-24 rounded bg-[var(--color-border-light)] animate-pulse mb-4" />
              <div className="space-y-2.5">
                <div className="h-11 rounded-xl bg-[var(--color-border-light)] animate-pulse" />
                <div className="h-11 rounded-xl bg-[var(--color-border-light)] animate-pulse" />
                <div className="h-11 rounded-xl bg-[var(--color-border-light)] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 animate-fadeIn bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)]">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-primary-soft)] mb-4 text-[var(--color-primary)]">
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <p className="text-sm text-[var(--color-muted)] mb-4">尚無任何小組</p>
          <Link
            href="/admin/groups"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] transition-colors"
          >
            前往建立小組
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group, idx) => (
            <div
              key={group.id}
              className="bg-[var(--color-surface)] rounded-2xl overflow-hidden border border-[var(--color-border)] shadow-[var(--shadow-card)] transition-all duration-200 hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 animate-slideUp"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="h-1.5 bg-[var(--color-primary)]" />
              <div className="p-5 sm:p-6">
                <h2 className="text-lg font-bold font-serif text-[var(--color-primary)] mb-4">
                  {group.name}
                </h2>
                <div className="space-y-2">
                  <Link
                    href={`/admin/groups/members?id=${group.id}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] shadow-sm shadow-[var(--color-primary)]/20 hover:shadow-md hover:translate-y-[-1px] active:translate-y-[0px] transition-all min-h-[48px]"
                    style={{ color: "#FFFFFF" }}
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                    </svg>
                    成員管理
                  </Link>
                  <Link
                    href={`/admin/groups/service-items?id=${group.id}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[var(--color-accent-dark)] bg-[var(--color-accent-soft)] hover:opacity-90 transition-all min-h-[48px]"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                    服事項目管理
                  </Link>
                  <Link
                    href={`/admin/schedule/detail?groupId=${group.id}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[var(--color-text)] bg-[var(--color-bg-soft)] hover:bg-[var(--color-border-light)] transition-all min-h-[48px]"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    排班管理
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
