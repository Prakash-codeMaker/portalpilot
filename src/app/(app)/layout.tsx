import type { ReactNode } from "react";
import { AppShell } from "@/components/shell";
import { ensureSeeded } from "@/db/repository";

export const dynamic = "force-dynamic";

export default async function ProductLayout({ children }: { children: ReactNode }) {
  await ensureSeeded();
  return <AppShell>{children}</AppShell>;
}
