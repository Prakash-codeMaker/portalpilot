import { jsonHandler } from "@/lib/api";
import { dashboardStats, listApprovals } from "@/db/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonHandler(async () => {
    const items = await listApprovals();
    const stats = await dashboardStats();
    return { items, stats };
  });
}
