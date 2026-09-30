import { jsonHandler, readJson } from "@/lib/api";
import { createId } from "@/lib/core";
import { db } from "@/db";
import { applications, portalApplications } from "@/db/schema";
import { listApplications } from "@/db/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  return jsonHandler(() =>
    listApplications({
      search: url.searchParams.get("search") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      portal: url.searchParams.get("portal") ?? undefined,
      attention: url.searchParams.get("attention") === "true",
      evidenceState: url.searchParams.get("evidenceState") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      page: Number(url.searchParams.get("page") ?? "1"),
      pageSize: Number(url.searchParams.get("pageSize") ?? "25"),
      includeAllDemo: url.searchParams.get("includeAllDemo") === "true",
    }),
  );
}

export async function POST(request: Request) {
  const body = await readJson<{
    id?: string;
    title: string;
    entity: string;
    site: string;
    portal?: string;
    status?: string;
    deadline?: string;
  }>(request);
  return jsonHandler(async () => {
    if (!body.title?.trim() || !body.entity?.trim() || !body.site?.trim()) {
      throw new Error("title, entity and site are required");
    }
    if (body.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(body.deadline)) {
      throw new Error("deadline must use YYYY-MM-DD");
    }
    const id = body.id ?? createId("app").replace("app_", "X-");
    await db.insert(applications).values({
      id,
      externalId: id,
      portal: body.portal?.trim() || "Unconfigured portal",
      title: body.title.trim(),
      entity: body.entity.trim(),
      site: body.site.trim(),
      status: body.status ?? "UNDER_REVIEW",
      deadline: body.deadline,
    });
    await db.insert(portalApplications).values({
      id,
      title: body.title,
      entity: body.entity,
      site: body.site,
      status: body.status ?? "UNDER_REVIEW",
      deadline: body.deadline,
    });
    return { id };
  }, { status: 201 });
}
