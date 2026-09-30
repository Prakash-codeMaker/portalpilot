import { jsonHandler, readJson } from "@/lib/api";
import { addDocument, listDocuments } from "@/db/repository";
import { safeFilename } from "@/lib/core";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const url = new URL(request.url);
  return jsonHandler(() => listDocuments({ search: url.searchParams.get("search") ?? undefined, status: url.searchParams.get("status") ?? undefined, page: Number(url.searchParams.get("page") ?? "1"), pageSize: Number(url.searchParams.get("pageSize") ?? "50") }));
}
export async function POST(request: Request) {
  const body = await readJson<{ applicationId?: string; name?: string; type?: string; content?: string; entity?: string; site?: string; issuedAt?: string; expiresAt?: string; certificateId?: string }>(request);
  return jsonHandler(async () => {
    if (!body.applicationId || !body.name || !body.type || !body.content) throw new Error("applicationId, name, type and content are required");
    if (body.content.length > 1_500_000) throw new Error("Document is too large for the demo service.");
    return addDocument(body.applicationId, { name: safeFilename(body.name), type: body.type, content: body.content, entity: body.entity ?? "", site: body.site ?? "", issuedAt: body.issuedAt, expiresAt: body.expiresAt, certificateId: body.certificateId });
  });
}
