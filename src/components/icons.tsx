import type { SVGProps, ReactNode } from "react";

type P = SVGProps<SVGSVGElement>;
function I({ children, ...props }: P & { children: ReactNode }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>{children}</svg>;
}
export const IconGrid = (p: P) => <I {...p}><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></I>;
export const IconInbox = (p: P) => <I {...p}><path d="M4 5h16v14H4z"/><path d="M4 15h4l2 2h4l2-2h4"/></I>;
export const IconShield = (p: P) => <I {...p}><path d="M12 3 19 6v5c0 5-3.2 8.4-7 10-3.8-1.6-7-5-7-10V6z"/><path d="m9 12 2 2 4-4"/></I>;
export const IconFile = (p: P) => <I {...p}><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></I>;
export const IconActivity = (p: P) => <I {...p}><path d="M3 12h4l2-6 4 12 2-6h6"/></I>;
export const IconBell = (p: P) => <I {...p}><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></I>;
export const IconSettings = (p: P) => <I {...p}><path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/><path d="m4.9 4.9 1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4M12 3v2M12 19v2"/></I>;
export const IconSearch = (p: P) => <I {...p}><circle cx="11" cy="11" r="6"/><path d="m16 16 5 5"/></I>;
export const IconChevron = (p: P) => <I {...p}><path d="m9 6 6 6-6 6"/></I>;
export const IconCheck = (p: P) => <I {...p}><path d="m5 12 4 4L19 6"/></I>;
export const IconX = (p: P) => <I {...p}><path d="M6 6l12 12M18 6 6 18"/></I>;
export const IconAlert = (p: P) => <I {...p}><path d="M12 4 21 19H3z"/><path d="M12 9v4M12 16h.01"/></I>;
export const IconClock = (p: P) => <I {...p}><circle cx="12" cy="12" r="8"/><path d="M12 8v5l3 2"/></I>;
export const IconExternal = (p: P) => <I {...p}><path d="M14 5h5v5M19 5l-8 8"/><path d="M18 13v5H6V6h5"/></I>;
export const IconPlay = (p: P) => <I {...p}><path d="m9 6 8 6-8 6z"/></I>;
export const IconRefresh = (p: P) => <I {...p}><path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v6h-6"/></I>;
export const IconDatabase = (p: P) => <I {...p}><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7"/></I>;
export const IconBrowser = (p: P) => <I {...p}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9h16M8 6.5h.01M11 6.5h.01M14 6.5h.01"/></I>;
export const IconTerminal = (p: P) => <I {...p}><rect x="4" y="5" width="16" height="14" rx="2"/><path d="m8 9 3 3-3 3M13 15h3"/></I>;
