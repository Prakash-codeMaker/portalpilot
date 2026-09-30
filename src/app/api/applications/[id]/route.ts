import { jsonHandler, param } from "@/lib/api";
import { getApplicationBundle } from "@/db/repository";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = await param(ctx, "id");
  return jsonHandler(async () => {
    const bundle = await getApplicationBundle(id);
    if (!bundle) {
      return { error: "Not found" };
    }
    return bundle;
  });
}
