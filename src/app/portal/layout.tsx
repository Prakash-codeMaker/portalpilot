import type { ReactNode } from "react";
import { ensureSeeded } from "@/db/repository";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  await ensureSeeded();
  return (
    <div className="min-h-screen bg-[#e8eef5] text-[#152033]">
      <header className="border-b border-[#c5d0df] bg-[#0f2744] text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-white/70">Demo authority</div>
            <div className="text-[15px] font-medium">PortalPilot Demo Authority</div>
          </div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-amber-200">Not a government portal</div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
