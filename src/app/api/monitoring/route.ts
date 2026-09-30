import { jsonHandler, readJson } from "@/lib/api";
import { listMonitoringRules, updateMonitoringRule } from "@/db/repository";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("applicationId") ?? undefined;
  return jsonHandler(async () => ({ rules: await listMonitoringRules(id) }));
}
export async function POST(request: Request) {
  const body = await readJson<{ id?: string; enabled?: boolean; intervalMinutes?: number }>(request);
  return jsonHandler(async () => {
    if (!body.id) throw new Error("rule id required");
    return { rule: await updateMonitoringRule(body.id, { enabled: body.enabled, intervalMinutes: body.intervalMinutes }) };
  });
}
