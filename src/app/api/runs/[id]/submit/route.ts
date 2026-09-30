import { jsonHandler } from "@/lib/api";
import { submitRun } from "@/workflow/engine";
import { getSettings } from "@/db/repository";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return jsonHandler(async () => { const settings = await getSettings(); return submitRun(id, { actor: settings.operatorName }); });
}
