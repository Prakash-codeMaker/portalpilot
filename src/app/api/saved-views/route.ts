import { jsonHandler, readJson } from "@/lib/api";
import { createSavedView, listSavedViews } from "@/db/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const resource = new URL(request.url).searchParams.get("resource") ?? "applications";
  return jsonHandler(() => listSavedViews(resource).then((views) => ({ views })));
}

export async function POST(request: Request) {
  const body = await readJson<{ name?: string; resource?: string; filters?: Record<string, unknown> }>(request);
  return jsonHandler(async () => {
    if (!body.name?.trim()) throw new Error("name required");
    return { view: await createSavedView({ name: body.name.trim(), resource: body.resource ?? "applications", filters: body.filters ?? {} }) };
  }, { status: 201 });
}
