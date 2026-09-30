import "dotenv/config";
import { enqueueDueMonitoringChecks } from "../src/db/repository";
import { processQueuedJobs } from "../src/workflow/engine";

const raw = Number(process.env.PORTALPILOT_WORKER_BATCH ?? "5");
const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 20) : 5;

const scheduled = await enqueueDueMonitoringChecks(limit);
const result = await processQueuedJobs(limit);

console.log(JSON.stringify({
  worker: process.pid,
  scheduled,
  processed: result.processed,
}, null, 2));
