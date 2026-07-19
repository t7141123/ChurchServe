"use client";

import { useState, useRef, useEffect } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  triggerClassName?: string;
}

export function Select({ value, onChange, options, placeholder, ariaLabel, className = "", triggerClassName = "" }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={ariaLabel}
        className={`flex items-center justify-between w-full gap-1 pl-3 pr-2.5 py-2.5 rounded-xl bg-[var(--color-bg-soft)] hover:bg-[var(--color-border-light)] border border-[var(--color-border)] text-[var(--color-text)] text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 transition-all ${triggerClassName}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder || "請選擇"}</span>
        <svg
          className={`w-4 h-4 text-[var(--color-muted)] shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div
        className={`absolute left-0 right-0 top-full mt-1.5 z-50 transition-all duration-200 ease-out ${
          open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-1 pointer-events-none"
        }`}
      >
        <div className="bg-white rounded-2xl shadow-xl border border-[var(--color-border)] overflow-hidden py-1 max-h-60 overflow-y-auto">
          {options.length === 0 && placeholder && (
            <div className="px-4 py-3 text-sm text-[var(--color-muted)] text-center">{placeholder}</div>
          )}
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                option.value === value
                  ? "text-[var(--color-primary)] bg-[var(--color-primary-soft)] font-medium"
                  : "text-[var(--color-text)] hover:bg-[var(--color-primary-soft)]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
