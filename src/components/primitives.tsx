import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "inverse";
  size?: "sm" | "md" | "lg";
}) {
  const variants = {
    primary: "bg-ink text-white hover:bg-[#252b27] shadow-[0_1px_1px_rgba(0,0,0,.08)]",
    secondary: "border border-line bg-paper text-ink hover:bg-canvas hover:border-line-strong",
    ghost: "bg-transparent text-ink-soft hover:bg-canvas hover:text-ink",
    danger: "bg-danger text-white hover:bg-[#941c13]",
    inverse: "bg-white text-ink hover:bg-canvas",
  };
  const sizes = {
    sm: "h-8 px-3 text-[12px]",
    md: "h-9 px-3.5 text-[13px]",
    lg: "h-[42px] px-4 text-[13px]",
  };
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-[9px] font-semibold tracking-[-0.01em] transition-[background,border,box-shadow,transform] duration-150 disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-px",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function Badge({ tone = "neutral", children, className }: { tone?: "neutral" | "success" | "warning" | "danger" | "info" | "accent"; children: ReactNode; className?: string }) {
  const tones = {
    neutral: "bg-canvas text-ink-soft border-line",
    success: "bg-success-soft text-success border-success/20",
    warning: "bg-warning-soft text-warning border-warning/20",
    danger: "bg-danger-soft text-danger border-danger/20",
    info: "bg-info-soft text-info border-info/20",
    accent: "bg-accent-soft text-accent-2 border-accent/20",
  };
  return <span className={cx("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none", tones[tone], className)}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { tone: "neutral" | "success" | "warning" | "danger" | "info" | "accent"; label: string }> = {
    DRAFT: { tone: "neutral", label: "Draft" },
    SUBMITTED: { tone: "info", label: "Submitted" },
    UNDER_REVIEW: { tone: "accent", label: "Under review" },
    CLARIFICATION_REQUIRED: { tone: "warning", label: "Clarification required" },
    APPROVED: { tone: "success", label: "Approved" },
    REJECTED: { tone: "danger", label: "Rejected" },
    UNKNOWN: { tone: "neutral", label: "Unknown" },
    VERIFIED: { tone: "success", label: "Verified" },
    FAILED: { tone: "danger", label: "Failed" },
    CONFLICT: { tone: "warning", label: "Conflict" },
    STALE: { tone: "warning", label: "Stale" },
    MISSING: { tone: "neutral", label: "Missing" },
    WAITING_APPROVAL: { tone: "info", label: "Awaiting approval" },
    COMPLETE: { tone: "success", label: "Complete" },
    SUBMISSION_VERIFIED: { tone: "success", label: "Submission verified" },
    SUBMISSION_UNVERIFIED: { tone: "danger", label: "Submission unverified" },
    SUBMISSION_NOT_VERIFIED: { tone: "danger", label: "Submission unverified" },
    BLOCKED: { tone: "danger", label: "Blocked" },
    READY_FOR_APPROVAL: { tone: "success", label: "Ready for review" },
    DEMO: { tone: "neutral", label: "Demo" },
    LIVE: { tone: "accent", label: "Live Solari" },
  };
  const item = map[status] ?? { tone: "neutral" as const, label: status.replaceAll("_", " ") };
  return <Badge tone={item.tone}><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />{item.label}</Badge>;
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("surface rounded-xl", className)} {...props} />;
}

export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={cx("surface rounded-xl", className)}>
    {title ? <header className="flex items-center justify-between border-b border-line px-5 py-3.5"><h2 className="eyebrow">{title}</h2>{action}</header> : null}
    <div className="p-5">{children}</div>
  </section>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-canvas text-muted">—</div>
    <h3 className="mt-4 text-[16px] font-semibold tracking-[-0.02em]">{title}</h3>
    <p className="mt-2 max-w-md text-[13px] leading-6 text-muted">{body}</p>
    {action ? <div className="mt-5">{action}</div> : null}
  </div>;
}

export function ErrorState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="rounded-xl border border-danger/20 bg-danger-soft/65 px-5 py-4">
    <p className="eyebrow text-danger">Action required</p>
    <h3 className="mt-1 text-[16px] font-semibold">{title}</h3>
    <p className="mt-1 text-[13px] leading-6 text-ink-soft">{body}</p>
    {action ? <div className="mt-3">{action}</div> : null}
  </div>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-lg bg-canvas-2", className)} />;
}

export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <button className="absolute inset-0 bg-[#0c120f]/40 backdrop-blur-[2px]" aria-label="Close dialog" onClick={onClose} />
    <div className="relative z-10 m-3 w-full max-w-xl rounded-2xl border border-line bg-paper p-6 shadow-[0_30px_90px_rgba(12,18,15,.2)]">
      <div className="flex items-start justify-between gap-5">
        <div><p className="eyebrow">PortalPilot</p><h2 id="modal-title" className="mt-1 text-[20px] font-semibold tracking-[-0.03em]">{title}</h2></div>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-canvas hover:text-ink" aria-label="Close">×</button>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  </div>;
}
