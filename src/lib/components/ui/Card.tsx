"use client";

import { HTMLAttributes } from "react";

type CardVariant = "default" | "elevated" | "glass" | "interactive";
type CardPadding = "none" | "sm" | "md" | "lg";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  as?: "div" | "a" | "button";
  href?: string;
}

const variantStyles: Record<CardVariant, string> = {
  default:
    "bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-card)]",
  elevated:
    "bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-card-hover)]",
  glass:
    "glass",
  interactive:
    "bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5 cursor-pointer",
};

const paddingStyles: Record<CardPadding, string> = {
  none: "p-0",
  sm: "p-3",
  md: "p-5",
  lg: "p-7",
};

export function Card({
  variant = "default",
  padding = "md",
  as: Component = "div",
  href,
  className = "",
  children,
  ...props
}: CardProps) {
  const classes = `rounded-2xl transition-all duration-200 ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`;

  if (Component === "a" && href) {
    return (
      <a href={href} className={`block ${classes}`} {...(props as HTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </a>
    );
  }

  if (Component === "button") {
    return (
      <button className={`text-left w-full ${classes}`} {...(props as HTMLAttributes<HTMLButtonElement>)}>
        {children}
      </button>
    );
  }

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = "", children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-lg font-bold font-serif text-[var(--color-text)] ${className}`} {...props}>
      {children}
    </h3>
  );
}
