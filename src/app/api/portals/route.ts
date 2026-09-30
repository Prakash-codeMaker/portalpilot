import { jsonHandler, readJson } from "@/lib/api";
import { createPortal, listPortals } from "@/db/repository";
import { validatePortalUrl } from "@/lib/core";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonHandler(async () => ({ portals: await listPortals() }));
}

export async function POST(request: Request) {
  const body = await readJson<{ name?: string; baseUrl?: string; connectorType?: string; capabilities?: string[] }>(request);
  return jsonHandler(async () => {
    if (!body.name?.trim() || !body.baseUrl?.trim()) throw new Error("name and baseUrl are required");
    validatePortalUrl(body.baseUrl);
    return { portal: await createPortal({ name: body.name.trim(), baseUrl: body.baseUrl.trim(), connectorType: body.connectorType, capabilities: body.capabilities }) };
  }, { status: 201 });
}
