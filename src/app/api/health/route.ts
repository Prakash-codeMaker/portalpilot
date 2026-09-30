import { db } from "@/db";
import { sql } from "drizzle-orm";
import { isLiveConfigured, readSolariBaseUrl } from "@/lib/core";
import { getMode, listPortals } from "@/db/repository";
export const dynamic = "force-dynamic";
export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};
  try { await db.execute(sql`select 1`); checks.database = { ok: true }; } catch (e) { checks.database = { ok: false, detail: e instanceof Error ? e.message : "database error" }; }
  const mode = await getMode().catch(() => "DEMO");
  checks.solari = mode === "DEMO" ? { ok: true, detail: "Demo mode" } : { ok: isLiveConfigured(), detail: isLiveConfigured() ? readSolariBaseUrl() : "SOLARI_API_KEY missing" };
  const portals = await listPortals().catch(() => []);
  checks.portalRegistry = { ok: portals.length > 0, detail: `${portals.length} connector(s)` };
  const ok = Object.values(checks).every((v) => v.ok);
  return Response.json({ ok, checks, mode }, { status: ok ? 200 : 503 });
}
