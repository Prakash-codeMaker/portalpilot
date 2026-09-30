import { jsonHandler } from "@/lib/api";
import { listRuns } from "@/db/repository";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url);
  return jsonHandler(() => listRuns({ status: url.searchParams.get("status") ?? undefined, mode: url.searchParams.get("mode") ?? undefined, page: Number(url.searchParams.get("page") ?? "1"), pageSize: Number(url.searchParams.get("pageSize") ?? "50") }));
}
