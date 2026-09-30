import { jsonHandler } from "@/lib/api";
import { searchAll } from "@/db/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return jsonHandler(async () => {
    if (q.trim().length < 1) return { applications: [], documents: [], runs: [], events: [] };
    return searchAll(q.trim());
  });
}
