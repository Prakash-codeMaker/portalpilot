import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  applicationEvents,
  applications,
  approvals,
  auditLogs,
  documents,
  evidence,
  jobs,
  monitoringRules,
  notifications,
  observations,
  portalApplications,
  portals,
  requirements,
  runEvents,
  runs,
  savedViews,
  users,
  workspaceMembers,
  workspaceSettings,
  workspaces,
} from "@/db/schema";
import {
  createId,
  DEMO_DATE,
  PRIMARY_APPLICATION_ID,
  PRIMARY_QUERY_ID,
  sha256,
  type ExecutionMode,
} from "@/lib/core";
import {
  FACTORY_LAYOUT,
  FIRE_CERTIFICATE_NEW,
  FIRE_CERTIFICATE_OLD,
  POLLUTION_CONSENT,
  type DocumentFixture,
} from "@/demo/documents";

const DEMO_PORTAL_NAME = "PortalPilot Demo Authority";

export async function getSettings() {
  await ensureWorkspaceFoundation();
  const [row] = await db.select().from(workspaceSettings).where(eq(workspaceSettings.id, "workspace")).limit(1);
  if (row) return row;
  const [created] = await db
    .insert(workspaceSettings)
    .values({
      id: "workspace",
      mode: "DEMO",
      demoDate: DEMO_DATE,
      operatorName: "Priya Shah",
      workspaceName: "Apex Manufacturing",
    })
    .returning();
  return created;
}

async function ensureWorkspaceFoundation() {
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, "workspace")).limit(1);
  if (!workspace) {
    await db.insert(workspaces).values({
      id: "workspace",
      name: "Apex Manufacturing",
      slug: "apex-manufacturing",
      plan: "demo",
    });
  }

  const [user] = await db.select().from(users).where(eq(users.id, "user_priya")).limit(1);
  if (!user) {
    await db.insert(users).values({
      id: "user_priya",
      name: "Priya Shah",
      email: "priya@apex.example",
    });
  }

  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, "workspace"), eq(workspaceMembers.userId, "user_priya")))
    .limit(1);
  if (!membership) {
    await db.insert(workspaceMembers).values({
      id: "membership_priya",
      workspaceId: "workspace",
      userId: "user_priya",
      role: "OWNER",
    });
  }

  const [portal] = await db.select().from(portals).where(eq(portals.id, "portal_demo")).limit(1);
  if (!portal) {
    await db.insert(portals).values({
      id: "portal_demo",
      workspaceId: "workspace",
      name: "PortalPilot Demo Authority",
      baseUrl: process.env.PORTALPILOT_PORTAL_URL?.trim() || "http://localhost:3000",
      connectorType: "DEMO",
      status: "HEALTHY",
      capabilities: ["OBSERVE", "QUERY_READ", "DOCUMENT_UPLOAD", "SUBMIT"],
      lastHealthCheckAt: new Date(),
    });
  }
}

export async function updateSettings(
  patch: Partial<{ mode: ExecutionMode; demoDate: string; operatorName: string; workspaceName: string; portalBaseUrl: string }>,
) {
  const current = await getSettings();
  const [updated] = await db
    .update(workspaceSettings)
    .set({
      mode: patch.mode ?? current.mode,
      demoDate: patch.demoDate ?? current.demoDate,
      operatorName: patch.operatorName ?? current.operatorName,
      workspaceName: patch.workspaceName ?? current.workspaceName,
      portalBaseUrl: patch.portalBaseUrl ?? current.portalBaseUrl,
    })
    .where(eq(workspaceSettings.id, "workspace"))
    .returning();
  return updated;
}

export async function getCurrentDate(): Promise<string> {
  const settings = await getSettings();
  return settings.demoDate || DEMO_DATE;
}

export async function getMode(): Promise<ExecutionMode> {
  const settings = await getSettings();
  return settings.mode === "LIVE" ? "LIVE" : "DEMO";
}

function docRow(applicationId: string, fixture: DocumentFixture, version = 1) {
  return {
    id: createId("doc"),
    applicationId,
    name: fixture.name,
    type: fixture.type,
    path: `/documents/${fixture.name}`,
    content: fixture.content,
    entity: fixture.entity,
    site: fixture.site,
    issuedAt: fixture.issuedAt,
    expiresAt: fixture.expiresAt,
    certificateId: fixture.certificateId,
    version,
    sha256: sha256(fixture.content),
    active: true,
  };
}

async function insertApplication(row: {
  id: string;
  title: string;
  entity: string;
  site: string;
  status: string;
  deadline: string;
  portal: string;
  needsAttention: boolean;
  evidenceState: string;
  verified: number;
  total: number;
  queryId?: string;
  queryText?: string;
  acknowledgement?: string;
  lastChangeSummary: string;
  lastCheckedAt?: Date;
}) {
  const now = new Date("2026-09-29T08:10:00.000Z");
  await db.insert(applications).values({
    id: row.id,
    externalId: row.id,
    portal: row.portal,
    title: row.title,
    entity: row.entity,
    site: row.site,
    status: row.status,
    deadline: row.deadline,
    lastCheckedAt: row.lastCheckedAt ?? now,
    queryId: row.queryId,
    queryText: row.queryText,
    acknowledgement: row.acknowledgement,
    needsAttention: row.needsAttention,
    evidenceState: row.evidenceState,
    verifiedRequirementCount: row.verified,
    totalRequirementCount: row.total,
    lastChangeAt: now,
    lastChangeSummary: row.lastChangeSummary,
  });
  await db.insert(portalApplications).values({
    id: row.id,
    title: row.title,
    entity: row.entity,
    site: row.site,
    status: row.status,
    deadline: row.deadline,
    queryId: row.queryId,
    queryText: row.queryText,
    acknowledgement: row.acknowledgement,
  });
}

export async function seedDemo(force = false) {
  const existing = await db.select({ id: applications.id }).from(applications).limit(1);
  if (existing.length > 0 && !force) return { seeded: false };

  if (force) {
    // Demo reset clears operational history while preserving workspace foundation.
    await db.delete(evidence);
    await db.delete(requirements);
    await db.delete(approvals);
    await db.delete(runEvents);
    await db.delete(runs);
    await db.delete(observations);
    await db.delete(applicationEvents);
    await db.delete(documents);
    await db.delete(portalApplications);
    await db.delete(applications);
    await db.delete(jobs);
    await db.delete(notifications);
    await db.delete(auditLogs);
  }

  await getSettings();

  await seedOperationalRecords();

  const primaryChecked = new Date("2026-09-29T08:14:00.000Z");
  await insertApplication({
    id: PRIMARY_APPLICATION_ID,
    title: "Factory Expansion Approval",
    entity: "Apex Manufacturing",
    site: "Pune Plant",
    status: "UNDER_REVIEW",
    deadline: "2026-10-15",
    portal: "PortalPilot Demo Authority",
    needsAttention: false,
    evidenceState: "UNKNOWN",
    verified: 0,
    total: 0,
    lastChangeSummary: "Under review",
    lastCheckedAt: primaryChecked,
  });

  for (const fixture of [FACTORY_LAYOUT, FIRE_CERTIFICATE_OLD, POLLUTION_CONSENT]) {
    await db.insert(documents).values(docRow(PRIMARY_APPLICATION_ID, fixture));
  }

  await db.insert(applicationEvents).values({
    id: createId("evt"),
    applicationId: PRIMARY_APPLICATION_ID,
    type: "APPLICATION_CREATED",
    afterValue: "UNDER_REVIEW",
    observedAt: new Date("2026-09-12T09:00:00.000Z"),
  });


  return { seeded: true };
}

async function seedOperationalRecords() {
  const [rule] = await db.select().from(monitoringRules).where(eq(monitoringRules.id, "monitor_mh23881")).limit(1);
  if (!rule) {
    await db.insert(monitoringRules).values({
      id: "monitor_mh23881",
      workspaceId: "workspace",
      applicationId: PRIMARY_APPLICATION_ID,
      enabled: true,
      intervalMinutes: 360,
      changeTypes: ["STATUS_CHANGED", "DEADLINE_CHANGED", "QUERY_RAISED", "QUERY_REMOVED"],
      notificationPolicy: { inApp: true, email: true, slack: false },
      quietHours: { start: "22:00", end: "07:00" },
      nextRunAt: new Date("2026-09-29T14:14:00.000Z"),
    });
  }

  const [saved] = await db.select().from(savedViews).where(eq(savedViews.id, "view_attention")).limit(1);
  if (!saved) {
    await db.insert(savedViews).values({
      id: "view_attention",
      workspaceId: "workspace",
      userId: "user_priya",
      name: "My attention queue",
      resource: "applications",
      filters: { attention: true },
    });
  }

  const [notice] = await db.select().from(notifications).where(eq(notifications.id, "notif_welcome")).limit(1);
  if (!notice) {
    await db.insert(notifications).values({
      id: "notif_welcome",
      workspaceId: "workspace",
      userId: "user_priya",
      applicationId: PRIMARY_APPLICATION_ID,
      type: "APPLICATION_CREATED",
      title: "Monitoring active",
      message: "PortalPilot is watching MH-23881 for status, deadline and clarification changes.",
    });
  }
}

let seedPromise: Promise<unknown> | null = null;
export async function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = seedDemo(false).finally(() => {
      seedPromise = null;
    });
  }
  await seedPromise;
}

export async function listApplications(opts: {
  search?: string;
  status?: string;
  portal?: string;
  attention?: boolean;
  evidenceState?: string;
  deadlineWithinDays?: number;
  sort?: string;
  page?: number;
  pageSize?: number;
  currentDate?: string;
  includeAllDemo?: boolean;
}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));
  const filters = [];
  if (!opts.includeAllDemo) filters.push(sql`(${applications.portal} <> ${DEMO_PORTAL_NAME} OR ${applications.id} = ${PRIMARY_APPLICATION_ID})`);
  if (opts.status) filters.push(eq(applications.status, opts.status));
  if (opts.portal) filters.push(eq(applications.portal, opts.portal));
  if (opts.attention) filters.push(eq(applications.needsAttention, true));
  if (opts.evidenceState) filters.push(eq(applications.evidenceState, opts.evidenceState));
  if (opts.search) {
    const q = `%${opts.search}%`;
    filters.push(
      or(
        ilike(applications.id, q),
        ilike(applications.title, q),
        ilike(applications.entity, q),
        ilike(applications.site, q),
        ilike(applications.queryId, q),
        ilike(applications.acknowledgement, q),
      ),
    );
  }

  const where = filters.length ? and(...filters) : undefined;
  const sort = opts.sort ?? "deadline";
  const order =
    sort === "status"
      ? asc(applications.status)
      : sort === "updated"
        ? desc(applications.updatedAt)
        : sort === "checked"
          ? desc(applications.lastCheckedAt)
          : asc(applications.deadline);

  const rows = await db
    .select()
    .from(applications)
    .where(where)
    .orderBy(order)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(applications)
    .where(where);

  return { rows, total: count, page, pageSize };
}

export async function getApplication(id: string) {
  const [row] = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
  return row ?? null;
}

export async function getApplicationBundle(id: string) {
  const application = await getApplication(id);
  if (!application) return null;
  const [docs, allReqs, allEv, events, appRuns, obs, portal] = await Promise.all([
    db.select().from(documents).where(eq(documents.applicationId, id)).orderBy(desc(documents.createdAt)),
    db.select().from(requirements).where(eq(requirements.applicationId, id)).orderBy(asc(requirements.createdAt)),
    db.select().from(evidence).where(eq(evidence.applicationId, id)).orderBy(asc(evidence.observedAt)),
    db
      .select()
      .from(applicationEvents)
      .where(eq(applicationEvents.applicationId, id))
      .orderBy(desc(applicationEvents.observedAt)),
    db.select().from(runs).where(eq(runs.applicationId, id)).orderBy(desc(runs.startedAt)),
    db.select().from(observations).where(eq(observations.applicationId, id)).orderBy(desc(observations.observedAt)),
    db.select().from(portalApplications).where(eq(portalApplications.id, id)).limit(1),
  ]);
  const runIds = appRuns.map((r) => r.id);
  const approvalRows =
    runIds.length > 0 ? await db.select().from(approvals).where(inArray(approvals.runId, runIds)) : [];
  const latestRunId = appRuns[0]?.id;
  const reqs = latestRunId ? allReqs.filter((r) => r.runId === latestRunId) : [];
  const ev = latestRunId ? allEv.filter((e) => e.runId === latestRunId) : [];
  return {
    application,
    documents: docs,
    requirements: reqs,
    evidence: ev,
    allRequirements: allReqs,
    allEvidence: allEv,
    events,
    runs: appRuns,
    observations: obs,
    portal: portal[0] ?? null,
    approvals: approvalRows,
  };
}

export async function dashboardStats() {
  const [totals] = await db
    .select({
      applications: sql<number>`count(*)::int`,
      attention: sql<number>`count(*) filter (where ${applications.needsAttention})::int`,
    })
    .from(applications)
    .where(sql`(${applications.portal} <> ${DEMO_PORTAL_NAME} OR ${applications.id} = ${PRIMARY_APPLICATION_ID})`);
  const [approvalCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(approvals)
    .innerJoin(applications, eq(applications.id, approvals.applicationId))
    .where(
      and(
        eq(approvals.status, "PENDING"),
        sql`(${applications.portal} <> ${DEMO_PORTAL_NAME} OR ${applications.id} = ${PRIMARY_APPLICATION_ID})`,
      ),
    );
  const [verifiedToday] = await db
    .select({
      count: sql<number>`count(*) filter (where ${runs.resultStatus} = 'SUBMISSION_VERIFIED' and ${runs.endedAt}::date = current_date)::int`,
    })
    .from(runs)
    .innerJoin(applications, eq(applications.id, runs.applicationId))
    .where(sql`(${applications.portal} <> ${DEMO_PORTAL_NAME} OR ${applications.id} = ${PRIMARY_APPLICATION_ID})`);
  return {
    applications: totals.applications,
    attention: totals.attention,
    awaitingApproval: approvalCount.count,
    verifiedToday: verifiedToday.count,
  };
}

export async function recordEvent(input: {
  applicationId: string;
  type: string;
  beforeValue?: string | null;
  afterValue?: string | null;
  metadata?: Record<string, unknown>;
  runId?: string;
  observedAt?: Date;
}) {
  const [row] = await db
    .insert(applicationEvents)
    .values({
      id: createId("evt"),
      applicationId: input.applicationId,
      type: input.type,
      beforeValue: input.beforeValue,
      afterValue: input.afterValue,
      metadata: input.metadata,
      runId: input.runId,
      observedAt: input.observedAt ?? new Date(),
    })
    .returning();

  const notificationMap: Record<string, { type: string; title: string }> = {
    QUERY_RAISED: { type: "NEW_QUERY", title: "New clarification detected" },
    DEADLINE_CHANGED: { type: "DEADLINE_CHANGED", title: "Application deadline changed" },
    VERIFICATION_FAILED: { type: "EVIDENCE_FAILED", title: "Evidence needs attention" },
    APPROVAL_REQUESTED: { type: "APPROVAL_REQUESTED", title: "Approval requested" },
    SUBMISSION_VERIFIED: { type: "SUBMISSION_VERIFIED", title: "Submission verified" },
    SUBMISSION_NOT_VERIFIED: { type: "SUBMISSION_UNVERIFIED", title: "Submission could not be verified" },
    AUTH_REQUIRED: { type: "AUTH_REQUIRED", title: "Authentication required" },
    PORTAL_UNAVAILABLE: { type: "PORTAL_UNAVAILABLE", title: "Portal unavailable" },
  };
  const mapped = notificationMap[input.type];
  if (mapped) {
    await createNotification({
      type: mapped.type,
      title: mapped.title,
      message: input.afterValue ?? input.type.replaceAll("_", " "),
      applicationId: input.applicationId,
      runId: input.runId,
    });
  }
  await createAuditLog({
    action: input.type,
    entityType: "application",
    entityId: input.applicationId,
    runId: input.runId,
    beforeState: input.beforeValue ? { value: input.beforeValue } : undefined,
    afterState: input.afterValue ? { value: input.afterValue } : undefined,
    metadata: input.metadata,
  });
  return row;
}

export async function raiseClarification(applicationId = PRIMARY_APPLICATION_ID) {
  const deadline = "2026-10-10";
  const queryText = "Upload updated factory layout, valid fire safety certificate and pollution consent.";
  const app = await getApplication(applicationId);
  if (!app) throw new Error("Application not found");
  await db
    .update(portalApplications)
    .set({
      status: "CLARIFICATION_REQUIRED",
      deadline,
      queryId: PRIMARY_QUERY_ID,
      queryText,
      updatedAt: new Date(),
    })
    .where(eq(portalApplications.id, applicationId));
  return { applicationId, queryId: PRIMARY_QUERY_ID, queryText, deadline, previousStatus: app.status, previousDeadline: app.deadline };
}

export async function changeDeadline(applicationId: string, deadline: string) {
  await db
    .update(portalApplications)
    .set({ deadline, updatedAt: new Date() })
    .where(eq(portalApplications.id, applicationId));
  return { applicationId, deadline };
}

export async function setFalseSuccess(applicationId = PRIMARY_APPLICATION_ID) {
  await db
    .update(portalApplications)
    .set({ falseSuccess: true, successMessage: false, lastMessage: null, updatedAt: new Date() })
    .where(eq(portalApplications.id, applicationId));
  return { applicationId, falseSuccess: true };
}

export async function replaceCertificate(applicationId = PRIMARY_APPLICATION_ID) {
  const active = await db
    .select()
    .from(documents)
    .where(and(eq(documents.applicationId, applicationId), eq(documents.type, "FIRE_SAFETY_CERTIFICATE"), eq(documents.active, true)));
  const nextVersion = Math.max(0, ...active.map((d) => d.version)) + 1;
  const created = docRow(applicationId, FIRE_CERTIFICATE_NEW, nextVersion);
  for (const old of active) {
    await db
      .update(documents)
      .set({ active: false, supersededBy: created.id })
      .where(eq(documents.id, old.id));
  }
  await db.insert(documents).values(created);
  await recordEvent({
    applicationId,
    type: "DOCUMENT_REPLACED",
    beforeValue: active[0]?.name,
    afterValue: created.name,
    metadata: { documentId: created.id, sha256: created.sha256, version: created.version },
  });
  return created;
}

export async function addDocument(applicationId: string, fixture: DocumentFixture) {
  const existing = await db
    .select()
    .from(documents)
    .where(and(eq(documents.applicationId, applicationId), eq(documents.type, fixture.type), eq(documents.active, true)));
  const nextVersion = Math.max(0, ...existing.map((d) => d.version)) + 1;
  const created = docRow(applicationId, fixture, nextVersion || 1);
  if (existing.length > 0) {
    for (const old of existing) {
      await db.update(documents).set({ active: false, supersededBy: created.id }).where(eq(documents.id, old.id));
    }
  }
  await db.insert(documents).values(created);
  await recordEvent({
    applicationId,
    type: existing.length ? "DOCUMENT_REPLACED" : "DOCUMENT_FOUND",
    afterValue: created.name,
    metadata: { documentId: created.id, sha256: created.sha256 },
  });
  return created;
}

export async function searchAll(query: string) {
  const q = `%${query}%`;
  const [apps, docs, runRows, events] = await Promise.all([
    db
      .select()
      .from(applications)
      .where(
        and(
          sql`(${applications.portal} <> ${DEMO_PORTAL_NAME} OR ${applications.id} = ${PRIMARY_APPLICATION_ID})`,
          or(
            ilike(applications.id, q),
            ilike(applications.title, q),
            ilike(applications.entity, q),
            ilike(applications.acknowledgement, q),
            ilike(applications.queryId, q),
          ),
        ),
      )
      .limit(8),
    db
      .select()
      .from(documents)
      .where(or(ilike(documents.name, q), ilike(documents.entity, q), ilike(documents.sha256, q)))
      .limit(8),
    db.select().from(runs).where(or(ilike(runs.id, q), ilike(runs.browserSessionId, q), ilike(runs.sandboxId, q))).limit(8),
    db
      .select()
      .from(applicationEvents)
      .where(or(ilike(applicationEvents.type, q), ilike(applicationEvents.afterValue, q)))
      .limit(8),
  ]);
  return { applications: apps, documents: docs, runs: runRows, events };
}

export async function listActivity(limit = 50) {
  return db
    .select({
      id: applicationEvents.id,
      applicationId: applicationEvents.applicationId,
      type: applicationEvents.type,
      beforeValue: applicationEvents.beforeValue,
      afterValue: applicationEvents.afterValue,
      metadata: applicationEvents.metadata,
      runId: applicationEvents.runId,
      observedAt: applicationEvents.observedAt,
    })
    .from(applicationEvents)
    .innerJoin(applications, eq(applications.id, applicationEvents.applicationId))
    .where(sql`(${applications.portal} <> ${DEMO_PORTAL_NAME} OR ${applications.id} = ${PRIMARY_APPLICATION_ID})`)
    .orderBy(desc(applicationEvents.observedAt))
    .limit(limit);
}

export async function listNotifications(opts?: { unreadOnly?: boolean; limit?: number }) {
  const filters = [];
  if (opts?.unreadOnly) filters.push(sql`${notifications.readAt} is null`);
  const rows = await db
    .select()
    .from(notifications)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(notifications.createdAt))
    .limit(Math.min(100, Math.max(1, opts?.limit ?? 50)));
  return rows;
}

export async function markNotificationRead(id: string) {
  const [row] = await db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.id, id)).returning();
  return row ?? null;
}

export async function createNotification(input: {
  type: string;
  title: string;
  message: string;
  applicationId?: string;
  runId?: string;
  userId?: string;
}) {
  const [row] = await db
    .insert(notifications)
    .values({
      id: createId("ntf"),
      workspaceId: "workspace",
      userId: input.userId ?? "user_priya",
      applicationId: input.applicationId,
      runId: input.runId,
      type: input.type,
      title: input.title,
      message: input.message,
    })
    .returning();
  return row;
}

export async function createAuditLog(input: {
  action: string;
  entityType: string;
  entityId?: string;
  requestId?: string;
  runId?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  actorUserId?: string;
}) {
  const [row] = await db
    .insert(auditLogs)
    .values({
      id: createId("aud"),
      workspaceId: "workspace",
      actorUserId: input.actorUserId ?? "user_priya",
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      requestId: input.requestId,
      runId: input.runId,
      beforeState: input.beforeState,
      afterState: input.afterState,
      metadata: input.metadata,
    })
    .returning();
  return row;
}

export async function listAuditLogs(limit = 100) {
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(Math.min(200, Math.max(1, limit)));
}

export async function listPortals() {
  return db.select().from(portals).orderBy(asc(portals.name));
}

export async function createPortal(input: { name: string; baseUrl: string; connectorType?: string; capabilities?: string[] }) {
  const [row] = await db
    .insert(portals)
    .values({
      id: createId("portal"),
      workspaceId: "workspace",
      name: input.name,
      baseUrl: input.baseUrl,
      connectorType: input.connectorType ?? "GENERIC_BROWSER",
      capabilities: input.capabilities ?? ["OBSERVE"],
      status: "HEALTHY",
      lastHealthCheckAt: new Date(),
    })
    .returning();
  return row;
}

export async function listMonitoringRules(applicationId?: string) {
  return db
    .select()
    .from(monitoringRules)
    .where(applicationId ? eq(monitoringRules.applicationId, applicationId) : undefined)
    .orderBy(desc(monitoringRules.updatedAt));
}

export async function updateMonitoringRule(
  id: string,
  patch: Partial<{
    enabled: boolean;
    intervalMinutes: number;
    changeTypes: string[];
    notificationPolicy: Record<string, unknown>;
    quietHours: { start: string; end: string };
    nextRunAt: Date;
  }>,
) {
  const [row] = await db
    .update(monitoringRules)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(monitoringRules.id, id))
    .returning();
  return row ?? null;
}

export async function enqueueDueMonitoringChecks(limit = 20) {
  const now = new Date();
  const rules = await db
    .select()
    .from(monitoringRules)
    .where(and(eq(monitoringRules.enabled, true), sql`${monitoringRules.nextRunAt} is not null`, sql`${monitoringRules.nextRunAt} <= ${now}`))
    .orderBy(asc(monitoringRules.nextRunAt))
    .limit(Math.min(100, Math.max(1, limit)));

  const created: string[] = [];
  for (const rule of rules) {
    const [existing] = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.applicationId, rule.applicationId), eq(jobs.type, "APPLICATION_CHECK"), or(eq(jobs.status, "QUEUED"), eq(jobs.status, "RUNNING"))))
      .limit(1);
    if (!existing) {
      const job = await createJob({
        type: "APPLICATION_CHECK",
        applicationId: rule.applicationId,
        payload: { monitoringRuleId: rule.id },
      });
      created.push(job.id);
    }
    const interval = Math.min(7 * 24 * 60, Math.max(15, rule.intervalMinutes));
    await db.update(monitoringRules).set({
      lastRunAt: now,
      nextRunAt: new Date(now.getTime() + interval * 60_000),
      updatedAt: now,
    }).where(eq(monitoringRules.id, rule.id));
  }
  return { created: created.length, jobIds: created };
}

export async function listJobs(opts?: { status?: string; limit?: number }) {
  const rows = await db
    .select()
    .from(jobs)
    .where(opts?.status ? eq(jobs.status, opts.status) : undefined)
    .orderBy(asc(jobs.scheduledAt))
    .limit(Math.min(200, Math.max(1, opts?.limit ?? 100)));
  return rows;
}

export async function createJob(input: {
  type: string;
  applicationId?: string;
  runId?: string;
  scheduledAt?: Date;
  payload?: Record<string, unknown>;
}) {
  const [row] = await db
    .insert(jobs)
    .values({
      id: createId("job"),
      workspaceId: "workspace",
      type: input.type,
      applicationId: input.applicationId,
      runId: input.runId,
      scheduledAt: input.scheduledAt ?? new Date(),
      payload: input.payload,
    })
    .returning();
  return row;
}

export async function updateJob(id: string, patch: Partial<typeof jobs.$inferInsert>) {
  const [row] = await db.update(jobs).set({ ...patch, updatedAt: new Date() }).where(eq(jobs.id, id)).returning();
  return row ?? null;
}

export async function listSavedViews(resource = "applications") {
  return db.select().from(savedViews).where(eq(savedViews.resource, resource)).orderBy(asc(savedViews.name));
}

export async function createSavedView(input: { name: string; resource?: string; filters?: Record<string, unknown>; userId?: string }) {
  const [row] = await db
    .insert(savedViews)
    .values({
      id: createId("view"),
      workspaceId: "workspace",
      userId: input.userId ?? "user_priya",
      name: input.name,
      resource: input.resource ?? "applications",
      filters: input.filters ?? {},
    })
    .returning();
  return row;
}

export async function listDocuments(opts?: { search?: string; status?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts?.pageSize ?? 50));
  const filters = [];
  if (opts?.search) {
    const q = `%${opts.search}%`;
    filters.push(or(ilike(documents.name, q), ilike(documents.entity, q), ilike(documents.site, q), ilike(documents.type, q), ilike(documents.certificateId, q)));
  }
  if (opts?.status === "ACTIVE") filters.push(eq(documents.active, true));
  if (opts?.status === "SUPERSEDED") filters.push(eq(documents.active, false));
  const where = filters.length ? and(...filters) : undefined;
  const rows = await db.select({
    id: documents.id,
    applicationId: documents.applicationId,
    name: documents.name,
    type: documents.type,
    entity: documents.entity,
    site: documents.site,
    issuedAt: documents.issuedAt,
    expiresAt: documents.expiresAt,
    certificateId: documents.certificateId,
    version: documents.version,
    sha256: documents.sha256,
    active: documents.active,
    supersededBy: documents.supersededBy,
    createdAt: documents.createdAt,
  }).from(documents).where(where).orderBy(desc(documents.createdAt)).limit(pageSize).offset((page - 1) * pageSize);
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(documents).where(where);
  return { rows, total: count, page, pageSize };
}

export async function listRuns(opts?: { status?: string; mode?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, opts?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts?.pageSize ?? 50));
  const filters = [];
  if (opts?.status) filters.push(eq(runs.resultStatus, opts.status));
  if (opts?.mode) filters.push(eq(runs.mode, opts.mode));
  const where = filters.length ? and(...filters) : undefined;
  const scopedWhere = and(
    sql`(${applications.portal} <> ${DEMO_PORTAL_NAME} OR ${applications.id} = ${PRIMARY_APPLICATION_ID})`,
    where,
  );
  const rows = await db.select({ run: runs }).from(runs).innerJoin(applications, eq(applications.id, runs.applicationId)).where(scopedWhere).orderBy(desc(runs.startedAt)).limit(pageSize).offset((page - 1) * pageSize);
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(runs).innerJoin(applications, eq(applications.id, runs.applicationId)).where(scopedWhere);
  return { rows: rows.map(({ run }) => run), total: count, page, pageSize };
}

export async function listUsers() {
  return db.select().from(users).orderBy(asc(users.name));
}

export async function listWorkspaceMembers() {
  const members = await db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, "workspace"));
  const allUsers = await listUsers();
  return members.map((member) => ({
    ...member,
    user: allUsers.find((user) => user.id === member.userId) ?? null,
  }));
}

export async function addWorkspaceMember(input: { name: string; email: string; role?: string }) {
  const id = createId("user");
  const userId = id;
  await db.insert(users).values({ id: userId, name: input.name, email: input.email });
  const [membership] = await db
    .insert(workspaceMembers)
    .values({ id: createId("membership"), workspaceId: "workspace", userId, role: input.role ?? "OPERATOR" })
    .returning();
  return { ...membership, user: { id: userId, name: input.name, email: input.email, status: "ACTIVE" } };
}

export async function updateWorkspace(input: { name?: string }) {
  const [row] = await db.update(workspaces).set({ name: input.name, updatedAt: new Date() }).where(eq(workspaces.id, "workspace")).returning();
  if (input.name) await db.update(workspaceSettings).set({ workspaceName: input.name }).where(eq(workspaceSettings.id, "workspace"));
  return row;
}

export async function getWorkspaceOverview() {
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, "workspace")).limit(1);
  const members = await listWorkspaceMembers();
  return { workspace, members };
}

export async function getUnreadNotificationCount() {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(notifications).where(sql`${notifications.readAt} is null`);
  return row?.count ?? 0;
}

export async function listEvidence(opts: { search?: string; type?: string; status?: string; applicationId?: string; page?: number; pageSize?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));
  const filters = [];
  if (opts.status) filters.push(eq(evidence.status, opts.status));
  if (opts.applicationId) filters.push(eq(evidence.applicationId, opts.applicationId));
  if (opts.type) filters.push(eq(documents.type, opts.type));
  if (opts.search) {
    const q = `%${opts.search}%`;
    filters.push(or(
      ilike(evidence.extractedValue, q),
      ilike(evidence.quote, q),
      ilike(evidence.field, q),
      ilike(documents.name, q),
      ilike(documents.entity, q),
    ));
  }
  const where = filters.length ? and(...filters) : undefined;
  const rows = await db
    .select({
      id: evidence.id,
      applicationId: evidence.applicationId,
      requirementId: evidence.requirementId,
      documentId: evidence.documentId,
      documentName: documents.name,
      documentType: documents.type,
      documentVersion: documents.version,
      field: evidence.field,
      extractedValue: evidence.extractedValue,
      status: evidence.status,
      quote: evidence.quote,
      page: evidence.page,
      hash: evidence.hash,
      observedAt: evidence.observedAt,
    })
    .from(evidence)
    .leftJoin(documents, eq(documents.id, evidence.documentId))
    .where(where)
    .orderBy(desc(evidence.observedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(evidence)
    .leftJoin(documents, eq(documents.id, evidence.documentId))
    .where(where);
  return { rows, total: count, page, pageSize };
}

export async function listApprovals() {
  const pending = await db.select().from(approvals).where(eq(approvals.status, "PENDING"));
  const result = [];
  for (const approval of pending) {
    const [run] = await db.select().from(runs).where(eq(runs.id, approval.runId)).limit(1);
    const application = await getApplication(approval.applicationId);
    if (!application) continue;
    if (application.portal === DEMO_PORTAL_NAME && application.id !== PRIMARY_APPLICATION_ID) continue;
    result.push({ approval, run, application });
  }
  return result;
}

export { documents, runs, runEvents, requirements, evidence, approvals, observations, applications, portalApplications };
