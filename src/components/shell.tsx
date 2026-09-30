"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Badge, Button, cx } from "@/components/primitives";
import {
  IconActivity, IconBell, IconBrowser, IconCheck, IconDatabase, IconFile, IconGrid,
  IconInbox, IconSearch, IconSettings, IconShield, IconTerminal,
} from "@/components/icons";

const PRIMARY_NAV = [
  { href: "/", label: "Overview", icon: IconGrid },
  { href: "/applications", label: "Applications", icon: IconInbox },
  { href: "/attention", label: "Attention", icon: IconShield },
  { href: "/approvals", label: "Approvals", icon: IconCheck },
  { href: "/evidence", label: "Evidence", icon: IconFile },
  { href: "/runs", label: "Runs", icon: IconTerminal },
  { href: "/activity", label: "Activity", icon: IconActivity },
];

const CONTROL_NAV = [
  { href: "/portals", label: "Portals", icon: IconBrowser },
  { href: "/monitoring", label: "Monitoring", icon: IconActivity },
  { href: "/documents", label: "Documents", icon: IconDatabase },
  { href: "/notifications", label: "Notifications", icon: IconBell },
  { href: "/audit", label: "Audit log", icon: IconShield },
];

type SearchPayload = {
  applications: Array<{ id: string; title: string; entity: string }>;
  documents: Array<{ id: string; name: string; applicationId: string }>;
  runs: Array<{ id: string; applicationId: string; phase: string }>;
  events: Array<{ id: string; type: string; applicationId: string; afterValue?: string | null }>;
};

type Environment = {
  mode: string;
  liveConfigured: boolean;
  liveBlockedReason: string | null;
  workspaceName?: string;
  operatorName?: string;
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [command, setCommand] = useState(false);
  const [env, setEnv] = useState<Environment | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const load = () => {
      fetch("/api/environment").then((r) => r.json()).then(setEnv).catch(() => setEnv({ mode: "DEMO", liveConfigured: false, liveBlockedReason: null }));
      fetch("/api/notifications?unreadOnly=true&limit=1").then((r) => r.json()).then((body) => setUnread(Number(body.unreadCount ?? 0))).catch(() => undefined);
    };
    load();
    const timer = window.setInterval(load, 20_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommand(true);
      }
      if (event.key === "Escape") {
        setCommand(false);
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const modeLabel = env?.mode === "LIVE" ? "LIVE SOLARI" : "DEMO";
  const liveBlocked = env?.mode === "LIVE" && !env.liveConfigured;
  const initials = (env?.operatorName || "You")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "YO";

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div className="flex min-h-screen">
        <aside className={cx(
          "fixed inset-y-0 left-0 z-40 flex w-[282px] shrink-0 bg-paper shadow-[8px_0_30px_rgba(12,18,15,0.035)] transition-transform duration-200 lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}>
          <div className="flex w-[66px] flex-col items-center border-r border-line bg-[#101513] py-4">
            <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white shadow-sm" aria-label="PortalPilot home">
              <span className="text-[15px] font-semibold tracking-[-0.05em]">P</span>
            </Link>
            <div className="mt-7 flex flex-1 flex-col items-center gap-2">
              {PRIMARY_NAV.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cx(
                    "flex h-9 w-9 items-center justify-center rounded-lg text-white/45 transition-colors hover:bg-white/[0.07] hover:text-white",
                    active && "bg-white/10 text-white"
                  )} aria-label={item.label} title={item.label}>
                    <Icon className="h-4 w-4" />
                  </Link>
                );
              })}
            </div>
            <button onClick={() => setCommand(true)} className="flex h-9 w-9 items-center justify-center rounded-lg text-white/45 hover:bg-white/[0.07] hover:text-white" aria-label="Search">
              <IconSearch className="h-4 w-4" />
            </button>
          </div>

          <div className="relative flex min-w-0 flex-1 flex-col">
            <div className="flex h-16 items-center border-b border-line px-5">
              <div className="min-w-0">
                <div className="text-[15px] font-semibold tracking-[-0.035em]">PortalPilot</div>
                <div className="mt-0.5 text-[11px] text-muted">Approval operations</div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-5">
              <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Workspace</div>
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-line bg-canvas/65 px-3 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-[11px] font-bold text-accent-2">
                  {(env?.workspaceName || "Workspace").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold">{env?.workspaceName ?? "Workspace"}</div>
                  <div className="mt-0.5 text-[11px] text-muted">Current workspace</div>
                </div>
              </div>

              <div className="mt-6 px-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Operate</div>
              <nav className="mt-2 space-y-1" aria-label="Primary">
                {PRIMARY_NAV.map((item) => <NavItem key={item.href} {...item} pathname={pathname} onClick={() => setOpen(false)} />)}
              </nav>

              <div className="mt-7 px-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Control</div>
              <nav className="mt-2 space-y-1">
                {CONTROL_NAV.map((item) => <NavItem key={item.href} {...item} pathname={pathname} onClick={() => setOpen(false)} />)}
              </nav>
            </div>

            <div className="border-t border-line px-4 py-4">
              <div className="flex items-center justify-between">
                <Link href="/demo" className="text-[11px] font-medium text-muted hover:text-ink">Demo lab</Link>
                <span className={cx("inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em]", env?.mode === "LIVE" ? "border-accent/20 bg-accent-soft text-accent-2" : "border-[#d9c79b] bg-[#fbf3df] text-[#876224]")}
                >
                  <span className={cx("h-1.5 w-1.5 rounded-full", env?.mode === "LIVE" ? "bg-accent" : "bg-[#b58a37]")} />
                  {modeLabel}
                </span>
              </div>
              <Link href="/settings" className="mt-3 flex items-center gap-2 text-[12px] text-muted hover:text-ink">
                <IconSettings className="h-3.5 w-3.5" /> Settings
                {unread > 0 ? <Badge tone="danger" className="ml-auto">{unread}</Badge> : null}
              </Link>
            </div>
          </div>
        </aside>

        {open ? <button className="fixed inset-0 z-30 bg-black/30 lg:hidden" aria-label="Close navigation" onClick={() => setOpen(false)} /> : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex min-h-[64px] items-center gap-3 border-b border-line bg-paper/[0.92] px-4 backdrop-blur sm:px-6 lg:px-8">
            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-paper lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
              <span className="space-y-1"><span className="block h-px w-4 bg-ink"/><span className="block h-px w-4 bg-ink"/><span className="block h-px w-4 bg-ink"/></span>
            </button>
            <button onClick={() => setCommand(true)} className="group flex h-10 max-w-xl flex-1 items-center gap-3 rounded-xl border border-line bg-canvas/45 px-3.5 text-left text-[13px] text-muted hover:border-line-strong hover:bg-paper">
              <IconSearch className="h-4 w-4" />
              <span className="truncate">Search applications, evidence, runs...</span>
              <span className="ml-auto hidden rounded-md border border-line bg-paper px-2 py-0.5 font-mono text-[10px] text-muted sm:inline">Ctrl K</span>
            </button>
            <div className="ml-auto flex items-center gap-2">
              <Link href="/notifications" className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-transparent text-muted hover:border-line hover:bg-paper hover:text-ink" aria-label="Notifications">
                <IconBell className="h-4 w-4" />
                {unread > 0 ? <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-danger" /> : null}
              </Link>
              <div className="hidden h-7 w-px bg-line sm:block" />
              <div className="hidden items-center gap-2.5 sm:flex">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-[11px] font-semibold text-white">{initials}</span>
                <div className="hidden xl:block">
                  <div className="text-[12px] font-semibold">{env?.operatorName ?? "You"}</div>
                  <div className="mt-0.5 text-[10px] text-muted">Operator</div>
                </div>
              </div>
            </div>
          </header>
          {liveBlocked ? <div className="border-b border-warning/20 bg-warning-soft px-4 py-2 text-[12px] text-warning lg:px-8">Live execution is not configured. Add <span className="mono">SOLARI_API_KEY</span> to enable remote runs.</div> : null}
          <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
            <div className="app-shell-main">{children}</div>
          </main>
        </div>
      </div>
      {command ? <CommandMenu onClose={() => setCommand(false)} onNavigate={(href) => { setCommand(false); router.push(href); }} /> : null}
    </div>
  );
}

function NavItem({ href, label, icon: Icon, pathname, onClick, badge }: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; pathname: string; onClick: () => void; badge?: number }) {
  const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
  return <Link href={href} onClick={onClick} className={cx("group flex h-9 items-center gap-3 rounded-lg px-3 text-[12px] font-medium transition-colors", active ? "bg-[#eef4f1] text-ink" : "text-ink-soft hover:bg-canvas",)}>
    <Icon className={cx("h-4 w-4 shrink-0", active ? "text-accent" : "text-muted group-hover:text-ink")} />
    <span className="truncate">{label}</span>
    {badge ? <span className="ml-auto text-[10px] text-muted">{badge}</span> : null}
  </Link>;
}

function CommandMenu({ onClose, onNavigate }: { onClose: () => void; onNavigate: (href: string) => void }) {
  const [q, setQ] = useState("");
  const [data, setData] = useState<SearchPayload | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);
  useEffect(() => {
    const term = q.trim();
    const handle = window.setTimeout(() => {
      if (!term) {
        setData(null);
        return;
      }
      fetch(`/api/search?q=${encodeURIComponent(term)}`).then((r) => r.json()).then(setData).catch(() => setData(null));
    }, term ? 150 : 0);
    return () => window.clearTimeout(handle);
  }, [q]);

  const items = useMemo(() => {
    const out: Array<{ href: string; label: string; group: string; detail?: string }> = [];
    for (const app of data?.applications ?? []) out.push({ href: `/applications/${app.id}`, label: app.id, group: "Applications", detail: app.title });
    for (const doc of data?.documents ?? []) out.push({ href: `/evidence?search=${encodeURIComponent(doc.name)}`, label: doc.name, group: "Documents", detail: doc.applicationId });
    for (const run of data?.runs ?? []) out.push({ href: `/runs/${run.id}`, label: run.id, group: "Runs", detail: run.phase });
    for (const event of data?.events ?? []) out.push({ href: `/applications/${event.applicationId}?tab=changes`, label: event.type.replaceAll("_", " "), group: "Activity", detail: event.applicationId });
    if (!q.trim()) return [
      { href: "/", label: "Overview", group: "Go to" },
      { href: "/applications", label: "Applications", group: "Go to" },
      { href: "/approvals", label: "Approvals", group: "Go to" },
      { href: "/evidence", label: "Evidence", group: "Go to" },
      { href: "/runs", label: "Runs", group: "Go to" },
      { href: "/monitoring", label: "Monitoring", group: "Go to" },
    ];
    return out;
  }, [data, q]);
  const safeActive = Math.min(active, Math.max(items.length - 1, 0));

  return <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[9vh]" role="dialog" aria-modal="true" aria-label="Command menu">
    <button className="absolute inset-0 bg-black/35 backdrop-blur-[2px]" aria-label="Close search" onClick={onClose} />
    <div className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-paper shadow-[0_30px_100px_rgba(20,26,22,.22)]">
      <div className="flex items-center gap-3 border-b border-line px-4">
        <IconSearch className="h-4 w-4 text-muted" />
        <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }} placeholder="Search MH-23881, document, run..." className="h-14 flex-1 bg-transparent text-[14px] outline-none" onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
          if (event.key === "ArrowDown") { event.preventDefault(); setActive((v) => Math.min(Math.max(items.length - 1, 0), v + 1)); }
          if (event.key === "ArrowUp") { event.preventDefault(); setActive((v) => Math.max(0, v - 1)); }
          if (event.key === "Enter" && items[safeActive]) { event.preventDefault(); onNavigate(items[safeActive].href); }
        }} />
      </div>
      <div className="max-h-[55vh] overflow-y-auto p-2">
        {items.length === 0 ? <p className="px-3 py-10 text-center text-[13px] text-muted">No matches found.</p> : null}
        {items.map((item, index) => <button key={`${item.group}-${item.href}-${item.label}`} onClick={() => onNavigate(item.href)} className={cx("flex w-full items-center justify-between rounded-xl px-3 py-3 text-left", index === safeActive ? "bg-canvas" : "hover:bg-canvas")}>
          <span className="min-w-0"><span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{item.group}</span><span className="mt-1 block truncate text-[13px] font-semibold">{item.label}</span></span>
          {item.detail ? <span className="mono ml-4 truncate text-muted">{item.detail}</span> : null}
        </button>)}
      </div>
      <div className="flex items-center justify-between border-t border-line bg-canvas/45 px-4 py-2 text-[10px] text-muted"><span>↑ ↓ navigate · Enter open</span><span>Esc close</span></div>
    </div>
  </div>;
}

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
      <h1 className="page-title">{title}</h1>
      {description ? <p className="mt-2 max-w-3xl text-[13px] leading-6 text-muted">{description}</p> : null}
    </div>
    {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
  </div>;
}

export { Badge, Button };
