import { jsonHandler, param, readJson } from "@/lib/api";
import { db } from "@/db";
import { portalApplications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEMO_ACK, PortalPilotError } from "@/lib/core";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const id = await param(ctx, "id");

  return jsonHandler(async () => {
    const [row] = await db
      .select()
      .from(portalApplications)
      .where(eq(portalApplications.id, id))
      .limit(1);

    if (!row) {
      throw new PortalPilotError("PORTAL_UNAVAILABLE");
    }

    return row;
  });
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const id = await param(ctx, "id");

  const contentType =
    request.headers.get("content-type") ?? "";

  let response = "";
  let documents = "";

  if (contentType.includes("application/json")) {
    const body = await readJson<{
      response?: string;
      documents?: string;
    }>(request);

    response = body.response ?? "";
    documents = body.documents ?? "";
  } else {
    const form = await request.formData();

    response = String(form.get("response") ?? "");
    documents = String(form.get("documents") ?? "");
  }

  return jsonHandler(async () => {
    const [row] = await db
      .select()
      .from(portalApplications)
      .where(eq(portalApplications.id, id))
      .limit(1);

    if (!row) {
      throw new PortalPilotError("PORTAL_UNAVAILABLE");
    }

    const documentCount = documents
      ? documents.split("\n").filter(Boolean).length
      : 0;

    const lastMessage =
      documentCount > 0
        ? `Application submitted successfully · ${documentCount} document references attached`
        : "Application submitted successfully";

    if (row.falseSuccess) {
      await db
        .update(portalApplications)
        .set({
          successMessage: true,
          submittedResponse: response,
          lastMessage,
          status: "DRAFT",
          acknowledgement: null,
          updatedAt: new Date(),
        })
        .where(eq(portalApplications.id, id));

      return {
        ok: true,
        message: "Application submitted successfully",
        status: "DRAFT",
        acknowledgement: null,
      };
    }

    await db
      .update(portalApplications)
      .set({
        status: "SUBMITTED",
        acknowledgement: DEMO_ACK,
        successMessage: true,
        submittedResponse: response,
        lastMessage,
        queryId: null,
        queryText: null,
        updatedAt: new Date(),
      })
      .where(eq(portalApplications.id, id));

    return {
      ok: true,
      message: "Application submitted successfully",
      status: "SUBMITTED",
      acknowledgement: DEMO_ACK,
    };
  });
}
