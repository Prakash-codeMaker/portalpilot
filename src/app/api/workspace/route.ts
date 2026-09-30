import { jsonHandler, readJson } from "@/lib/api";
import { addWorkspaceMember, getWorkspaceOverview, updateWorkspace } from "@/db/repository";

export const dynamic = "force-dynamic";

export async function GET() { return jsonHandler(getWorkspaceOverview); }

export async function POST(request: Request) {
  const body = await readJson<{ action?: "rename" | "invite"; name?: string; email?: string; role?: string }>(request);
  return jsonHandler(async () => {
    if (body.action === "rename") {
      if (!body.name?.trim()) throw new Error("name required");
      return { workspace: await updateWorkspace({ name: body.name.trim() }) };
    }
    if (body.action === "invite") {
      if (!body.name?.trim() || !body.email?.trim()) throw new Error("name and email are required");
      return { member: await addWorkspaceMember({ name: body.name.trim(), email: body.email.trim(), role: body.role }) };
    }
    throw new Error("Unsupported workspace action");
  });
}
