import { jsonHandler } from "@/lib/api";
import { listJobs } from "@/db/repository";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url);
  return jsonHandler(() => listJobs({ status: url.searchParams.get("status") ?? undefined, limit: Number(url.searchParams.get("limit") ?? "100") }).then((jobs) => ({ jobs })));
}
