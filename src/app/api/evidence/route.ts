import { jsonHandler } from "@/lib/api";
import { listEvidence } from "@/db/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return jsonHandler(() =>
    listEvidence({
      search: url.searchParams.get("search") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      applicationId: url.searchParams.get("applicationId") ?? undefined,
      page: Number(url.searchParams.get("page") ?? "1"),
      pageSize: Number(url.searchParams.get("pageSize") ?? "25"),
    }),
  );
}
