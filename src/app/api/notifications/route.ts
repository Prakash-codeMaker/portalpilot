import { jsonHandler, readJson } from "@/lib/api";
import { getUnreadNotificationCount, listNotifications, markNotificationRead } from "@/db/repository";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";
  return jsonHandler(async () => ({
    notifications: await listNotifications({ unreadOnly, limit: Number(url.searchParams.get("limit") ?? "50") }),
    unreadCount: await getUnreadNotificationCount(),
  }));
}
export async function POST(request: Request) {
  const body = await readJson<{ id?: string }>(request);
  return jsonHandler(async () => {
    if (!body.id) throw new Error("notification id required");
    return { notification: await markNotificationRead(body.id), unreadCount: await getUnreadNotificationCount() };
  });
}
