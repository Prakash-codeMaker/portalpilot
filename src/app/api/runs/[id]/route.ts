import { jsonHandler, param } from "@/lib/api";
import { getRunBundle } from "@/workflow/engine";
import { PortalPilotError } from "@/lib/core";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = await param(ctx, "id");
  return jsonHandler(async () => {
    const bundle = await getRunBundle(id);
    if (!bundle) throw new PortalPilotError("PORTAL_UNAVAILABLE", "Run not found.");
    return bundle;
  });
}
