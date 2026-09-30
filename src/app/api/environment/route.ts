import { jsonHandler, readJson } from "@/lib/api";
import { getSettings, updateSettings } from "@/db/repository";
import { isLiveConfigured, readSolariBaseUrl, type ExecutionMode } from "@/lib/core";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonHandler(async () => {
    const settings = await getSettings();
    const liveConfigured = isLiveConfigured();
    return {
      mode: settings.mode,
      demoDate: settings.demoDate,
      operatorName: settings.operatorName,
      workspaceName: settings.workspaceName,
      portalBaseUrl: settings.portalBaseUrl,
      liveConfigured,
      liveBlockedReason: !liveConfigured && settings.mode === "LIVE" ? "LIVE SOLARI MODE REQUIRES SOLARI_API_KEY" : null,
      solariBaseUrl: readSolariBaseUrl(),
      asyncExecution: process.env.PORTALPILOT_ASYNC === "true",
      profileConfigured: Boolean(process.env.SOLARI_PROFILE_ID?.trim()),
    };
  });
}

export async function POST(request: Request) {
  const body = await readJson<{ mode?: ExecutionMode; demoDate?: string; operatorName?: string; workspaceName?: string; portalBaseUrl?: string }>(request);
  return jsonHandler(async () => {
    const updated = await updateSettings({ mode: body.mode, demoDate: body.demoDate, operatorName: body.operatorName, workspaceName: body.workspaceName, portalBaseUrl: body.portalBaseUrl });
    const liveConfigured = isLiveConfigured();
    return {
      mode: updated.mode,
      demoDate: updated.demoDate,
      operatorName: updated.operatorName,
      workspaceName: updated.workspaceName,
      portalBaseUrl: updated.portalBaseUrl,
      liveConfigured,
      liveBlockedReason: !liveConfigured && updated.mode === "LIVE" ? "LIVE SOLARI MODE REQUIRES SOLARI_API_KEY" : null,
      solariBaseUrl: readSolariBaseUrl(),
      asyncExecution: process.env.PORTALPILOT_ASYNC === "true",
      profileConfigured: Boolean(process.env.SOLARI_PROFILE_ID?.trim()),
    };
  });
}
