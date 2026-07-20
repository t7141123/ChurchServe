"use client";

import { useState, useRef, useEffect } from "react";

interface Option {
  value: string;
  label: string;
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = "請選擇...",
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-[var(--color-glass-border)] bg-[var(--color-input-bg)] text-sm text-left transition-all duration-200 hover:border-[var(--color-primary)]/40 cursor-pointer"
      >
        <span className={selected ? "text-[var(--color-text)]" : "text-[var(--color-muted)]"}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className={`w-4 h-4 text-[var(--color-muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg animate-fadeIn overflow-hidden">
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[var(--color-muted)]">無選項</div>
          ) : (
            options.map(o => (
              <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer ${
                  o.value === value
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-semibold"
                    : "text-[var(--color-text)] hover:bg-[var(--color-bg-soft)]"
                }`}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
