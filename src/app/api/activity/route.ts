import { jsonHandler } from "@/lib/api";
import { listActivity } from "@/db/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? "80");
  return jsonHandler(() => listActivity(limit).then((events) => ({ events })));
}
