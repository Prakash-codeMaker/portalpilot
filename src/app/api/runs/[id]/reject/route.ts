import { jsonHandler, readJson } from "@/lib/api";
import { decideApproval } from "@/workflow/engine";
import { getSettings } from "@/db/repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await readJson<{ reason?: string }>(request);
  return jsonHandler(async () => { const settings = await getSettings(); return decideApproval(id, "REJECTED", settings.operatorName, body.reason); });
}
