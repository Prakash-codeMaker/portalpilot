import { jsonHandler } from "@/lib/api";
import { dashboardStats, listActivity, listApplications, getSettings } from "@/db/repository";
import { isLiveConfigured } from "@/lib/core";
import { db } from "@/db";
import { applicationEvents, applications } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonHandler(async () => {
    const [stats, attention, activity, settings, changes] = await Promise.all([
      dashboardStats(),
      listApplications({ attention: true, pageSize: 8, sort: "deadline" }),
      listActivity(12),
      getSettings(),
      db
        .select()
        .from(applicationEvents)
        .where(eq(applicationEvents.type, "STATUS_CHANGED"))
        .orderBy(desc(applicationEvents.observedAt))
        .limit(8),
    ]);
    const extraChanges = await db
      .select()
      .from(applicationEvents)
      .orderBy(desc(applicationEvents.observedAt))
      .limit(12);
    const flagged = await db
      .select()
      .from(applications)
      .where(eq(applications.needsAttention, true));
    return {
      stats,
      attention: attention.rows,
      activity,
      changes: extraChanges.length ? extraChanges : changes,
      flaggedCount: flagged.length,
      environment: {
        mode: settings.mode,
        demoDate: settings.demoDate,
        operatorName: settings.operatorName,
        workspaceName: settings.workspaceName,
        liveConfigured: isLiveConfigured(),
      },
    };
  });
}
