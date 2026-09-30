import { jsonHandler, readJson } from "@/lib/api";
import { PortalPilotError } from "@/lib/core";
import { getSettings } from "@/db/repository";
import { decideApproval, submitRun } from "@/workflow/engine";

export const dynamic = "force-dynamic";

export async function POST(request: Request, ctx: { params: Promise<{ id: string; action: string }> }) {
  const { id, action } = await ctx.params;
  const body = await readJson<{ reason?: string }>(request);

  return jsonHandler(async () => {
    if (action === "approve") { const settings = await getSettings(); return decideApproval(id, "APPROVED", settings.operatorName); }
    if (action === "reject") { const settings = await getSettings(); return decideApproval(id, "REJECTED", settings.operatorName, body.reason); }
    if (action === "submit") { const settings = await getSettings(); return submitRun(id, { actor: settings.operatorName }); }
    throw new PortalPilotError("PORTAL_UNAVAILABLE", `Unknown run action: ${action}`);
  });
}
