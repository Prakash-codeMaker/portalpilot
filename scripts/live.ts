import "dotenv/config";
import { getSettings, ensureSeeded, updateSettings } from "../src/db/repository";
import { queueCheck, waitForRun, getRunBundle } from "../src/workflow/engine";
import {
  PRIMARY_APPLICATION_ID,
  PortalPilotError,
  readSolariApiKey,
} from "../src/lib/core";

const args = process.argv.slice(2);
const applicationIndex = args.indexOf("--application");
const applicationId =
  applicationIndex >= 0
    ? args[applicationIndex + 1]
    : PRIMARY_APPLICATION_ID;

async function main() {
  if (!readSolariApiKey()) {
    console.error("LIVE SOLARI MODE REQUIRES SOLARI_API_KEY");
    process.exit(1);
  }

  if (!process.env.PORTALPILOT_PORTAL_URL?.trim()) {
    console.error(
      "LIVE Solari Browser observation requires PORTALPILOT_PORTAL_URL",
    );
    process.exit(1);
  }

  process.env.PORTALPILOT_ASYNC = "false";

  try {
    await ensureSeeded();

    await updateSettings({
      mode: "LIVE",
      portalBaseUrl: process.env.PORTALPILOT_PORTAL_URL.trim(),
    });

    const settings = await getSettings();

    console.log(
      `PortalPilot LIVE SOLARI\nApplication: ${applicationId}\nPortal: ${settings.portalBaseUrl}`,
    );

    const queued = await queueCheck(applicationId);
    console.log(`Run queued: ${queued.runId}`);

    const bundle = await waitForRun(queued.runId);

    const run =
      bundle?.run ??
      (await getRunBundle(queued.runId).then((value) => value?.run));

    console.log(
      JSON.stringify(
        {
          runId: queued.runId,
          mode: queued.mode,
          phase: run?.phase,
          resultStatus: run?.resultStatus,
          browserSessionId: run?.browserSessionId,
          sandboxId: run?.sandboxId,
          snapshotId: run?.snapshotId,
          replayAvailable: Boolean(run?.replayUrl),
          cleanupStatus: run?.cleanupStatus,
          error: run?.errorMessage ?? null,
        },
        null,
        2,
      ),
    );

    if (
      run?.resultStatus === "SUBMISSION_UNVERIFIED" ||
      run?.phase === "FAILED"
    ) {
      process.exitCode = 2;
    }
  } catch (error) {
    const message =
      error instanceof PortalPilotError
        ? `${error.code}: ${error.message}`
        : error instanceof Error
          ? error.message
          : String(error);

    console.error(message);
    process.exitCode = 1;
  }
}

void main();
