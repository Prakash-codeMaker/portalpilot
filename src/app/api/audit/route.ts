import { jsonHandler } from "@/lib/api";
import { listAuditLogs } from "@/db/repository";
export const dynamic = "force-dynamic";
export async function GET(request: Request) { return jsonHandler(() => listAuditLogs(Number(new URL(request.url).searchParams.get("limit") ?? "100")).then((logs) => ({ logs }))); }
