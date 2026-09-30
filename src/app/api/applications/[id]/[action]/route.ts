import { jsonHandler, param, readJson } from "@/lib/api";
import { addDocument, getApplicationBundle, listActivity } from "@/db/repository";
import { queueCheck } from "@/workflow/engine";
import { applicationEvents } from "@/db/schema";
import { db } from "@/db";
import { desc, eq } from "drizzle-orm";
import { PortalPilotError } from "@/lib/core";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string; action: string }> }) {
  const id = await param(ctx, "id");
  const action = (await ctx.params).action;
  return jsonHandler(async () => {
    if (action === "evidence") {
      const bundle = await getApplicationBundle(id);
      if (!bundle) throw new PortalPilotError("PORTAL_UNAVAILABLE", "Application not found.");
      return { evidence: bundle.evidence, requirements: bundle.requirements, documents: bundle.documents };
    }
    if (action === "events") {
      const events = await db
        .select()
        .from(applicationEvents)
        .where(eq(applicationEvents.applicationId, id))
        .orderBy(desc(applicationEvents.observedAt));
      return { events };
    }
    if (action === "documents") {
      const bundle = await getApplicationBundle(id);
      if (!bundle) throw new PortalPilotError("PORTAL_UNAVAILABLE", "Application not found.");
      return { documents: bundle.documents };
    }
    return { error: "Unknown action" };
  });
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string; action: string }> }) {
  const id = await param(ctx, "id");
  const action = (await ctx.params).action;
  const body = await readJson<{
    name?: string;
    type?: string;
    content?: string;
    entity?: string;
    site?: string;
    issuedAt?: string;
    expiresAt?: string;
    certificateId?: string;
  }>(request);

  return jsonHandler(async () => {
    if (action === "check") {
      return queueCheck(id);
    }
    if (action === "documents") {
      if (!body.name || !body.type || !body.content) {
        throw new PortalPilotError("DOCUMENT_MISSING", "name, type and content are required.");
      }
      const doc = await addDocument(id, {
        name: body.name,
        type: body.type,
        content: body.content,
        entity: body.entity ?? "",
        site: body.site ?? "",
        issuedAt: body.issuedAt,
        expiresAt: body.expiresAt,
        certificateId: body.certificateId,
      });
      return doc;
    }
    if (action === "activity") {
      return { events: await listActivity() };
    }
    throw new PortalPilotError("PORTAL_UNAVAILABLE", "Unknown action");
  });
}
