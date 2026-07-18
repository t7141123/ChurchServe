type BadgeVariant = "default" | "primary" | "secondary" | "accent" | "danger" | "success";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-[var(--color-border-light)] text-[var(--color-text-light)]",
  primary: "bg-[var(--color-primary)]/10 text-[var(--color-primary-dark)]",
  secondary: "bg-[var(--color-secondary)]/10 text-[var(--color-secondary-dark)]",
  accent: "bg-[var(--color-accent)]/10 text-[var(--color-accent-dark)]",
  danger: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
  success: "bg-[var(--color-success)]/10 text-[var(--color-secondary-dark)]",
};

export function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-medium transition-colors ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
