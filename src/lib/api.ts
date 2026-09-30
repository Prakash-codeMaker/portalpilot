import { PortalPilotError } from "@/lib/core";
import { ensureSeeded } from "@/db/repository";
import { randomUUID } from "node:crypto";

export async function jsonHandler<T>(fn: () => Promise<T>, init?: { status?: number }): Promise<Response> {
  const requestId = randomUUID();
  try {
    await ensureSeeded();
    const data = await fn();
    return Response.json(data, { status: init?.status ?? 200, headers: { "X-Request-ID": requestId } });
  } catch (error) {
    if (error instanceof PortalPilotError) {
      const status =
        error.code === "APPROVAL_REQUIRED"
          ? 403
          : error.code === "LIVE_MODE_REQUIRES_KEY"
            ? 409
            : error.code === "PORTAL_UNAVAILABLE"
              ? 503
              : 400;
      return Response.json(
        {
          error: error.message,
          code: error.code,
          title: error.code,
          requestId,
        },
        { status, headers: { "X-Request-ID": requestId } },
      );
    }
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message, code: "INTERNAL_ERROR", requestId }, { status: 500, headers: { "X-Request-ID": requestId } });
  }
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

export async function param(ctx: { params: Promise<Record<string, string>> }, key: string): Promise<string> {
  const params = await ctx.params;
  return params[key];
}
